import "server-only";

import type { DB } from "@/lib/data/types";
import { getEmailTemplate } from "@/lib/data/emails";
import { interpolateVariables } from "@/lib/emailTemplates";
import { DEFAULT_RESEND_CONFIG, emailCategoryBlockReason, sendEmail, sendEmailBatch } from "@/lib/resendService";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import type { EmailLog, EmailSendPayload, EmailSendResponse, ResendConfig } from "@/types/resend";
import { getUserTemplateVariables, getUsersTemplateVariables } from "@/lib/data/userVariables";
import { getAppearanceConfig } from "@/lib/data/appearance";
import { getSiteUrl } from "@/lib/siteUrl";

/**
 * Variáveis globais dos templates: identidade vem de Aparência, não do Resend.
 * Antes `{{nome_plataforma}}` usava o nome do remetente ("Fulano de Tal"), e
 * era isso que aparecia no assunto e no corpo dos e-mails.
 */
async function brandVariables(db: DB) {
  const appearance = await getAppearanceConfig(db);
  return {
    appName: appearance.platformName,
    nome_plataforma: appearance.platformName,
    cor_marca: appearance.primaryColor,
    link_plataforma: getSiteUrl(),
  };
}

type IntegrationRow = {
  enabled: boolean | null;
  config: Partial<ResendConfig> | null;
  secrets: { apiKey?: string } | null;
  status: string | null;
  updated_at: string | null;
};

/**
 * Resolve a configuração efetiva usada pelo backend.
 *
 * A tabela `integrations` é a fonte principal. Variáveis de ambiente continuam
 * sendo aceitas como fallback para instalações que gerenciam segredos fora do
 * painel. A chave nunca é devolvida diretamente por uma rota para o navegador.
 */
export async function getResendServerConfig(db: DB): Promise<ResendConfig> {
  const { data, error } = await db
    .from("integrations")
    .select("enabled, config, secrets, status, updated_at")
    .eq("slug", "resend")
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar a configuração do Resend: ${error.message}`);
  }

  const row = data as IntegrationRow | null;
  const stored = row?.config ?? {};
  const storedKey = row?.secrets?.apiKey?.trim() ?? "";
  const envKey = process.env.RESEND_API_KEY?.trim() ?? "";

  return {
    ...DEFAULT_RESEND_CONFIG,
    ...stored,
    apiKey: storedKey || envKey,
    fromEmail: stored.fromEmail || process.env.RESEND_FROM_EMAIL || DEFAULT_RESEND_CONFIG.fromEmail,
    fromName: stored.fromName || process.env.RESEND_FROM_NAME || DEFAULT_RESEND_CONFIG.fromName,
    enabled: row?.enabled ?? DEFAULT_RESEND_CONFIG.enabled,
    categories: {
      platform: {
        ...DEFAULT_RESEND_CONFIG.categories.platform,
        ...stored.categories?.platform,
      },
      notifications: {
        ...DEFAULT_RESEND_CONFIG.categories.notifications,
        ...stored.categories?.notifications,
      },
    },
    domainStatus: (row?.status as ResendConfig["domainStatus"] | undefined) ?? "not_started",
    updatedAt: row?.updated_at ?? DEFAULT_RESEND_CONFIG.updatedAt,
  };
}

function logRow(payload: Pick<EmailSendPayload, "to" | "subject" | "template">, result: EmailSendResponse) {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const status: EmailLog["status"] = result.success
    ? result.simulated
      ? "simulated"
      : "sent"
    : "failed";
  return {
    recipient: recipients[0] || "desconhecido",
    subject: payload.subject || "(sem assunto)",
    template: payload.template || "custom",
    status,
    resend_id: result.id ?? null,
    error: result.error ?? null,
  };
}

async function persistEmailLogs(db: DB, rows: ReturnType<typeof logRow>[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await db.from("email_logs").insert(rows);
  if (error) {
    console.error("[resend:logs] Não foi possível persistir o envio:", error.message);
  }
}

type TemplateDefinition = Awaited<ReturnType<typeof getEmailTemplate>>;

/** Interpola assunto/HTML/texto com os dados do destinatário. */
function renderPayload(
  payload: EmailSendPayload,
  template: TemplateDefinition,
  templateData: Record<string, unknown>,
): EmailSendPayload {
  if (payload.template && payload.template !== "test" && template) {
    return {
      ...payload,
      data: templateData,
      subject: interpolateVariables(payload.subject || template.subject, templateData, { diagnosticContext: "email-subject" }),
      html: interpolateVariables(payload.html || template.html, templateData, { html: true, diagnosticContext: "email-html" }),
    };
  }
  return {
    ...payload,
    data: templateData,
    subject: interpolateVariables(payload.subject || "", templateData, { diagnosticContext: "email-subject" }),
    html: payload.html ? interpolateVariables(payload.html, templateData, { html: true, diagnosticContext: "email-html" }) : payload.html,
    text: payload.text ? interpolateVariables(payload.text, templateData, { diagnosticContext: "email-text" }) : payload.text,
  };
}

export type SendConfiguredEmailOptions = {
  /** Sobrescreve campos da configuração salva (ex.: chave digitada na tela de teste). */
  configOverride?: Partial<ResendConfig>;
  /**
   * Ignora os liga/desliga por tipo de e-mail. Só para ações pontuais e
   * explícitas de um admin (teste de template, "reenviar acesso") — os
   * disparos automáticos e as campanhas respeitam a configuração.
   */
  ignoreCategory?: boolean;
};

/** Envia usando configuração e template persistidos, registrando o resultado. */
export async function sendConfiguredEmail(
  db: DB,
  payload: EmailSendPayload,
  options: SendConfiguredEmailOptions = {},
): Promise<EmailSendResponse> {
  const config = { ...(await getResendServerConfig(db)), ...(options.configOverride ?? {}) };

  const blocked = options.ignoreCategory ? null : emailCategoryBlockReason(payload.template, config.categories);
  if (blocked) {
    const result: EmailSendResponse = { success: false, error: blocked };
    await persistEmailLogs(db, [logRow(payload, result)]);
    return result;
  }

  const [userVariables, brand] = await Promise.all([
    payload.userId ? getUserTemplateVariables(db, payload.userId) : Promise.resolve({}),
    brandVariables(db),
  ]);
  const templateData = { ...brand, ...payload.data, userVariables };
  const template = payload.template && payload.template !== "test" ? await getEmailTemplate(db, payload.template) : null;
  const resolvedPayload = renderPayload(payload, template, templateData);

  const result = await sendEmail(resolvedPayload, config);
  await persistEmailLogs(db, [logRow(resolvedPayload, result)]);
  return result;
}

export type BatchRecipient = {
  to: string;
  userId?: string;
  /** Dados só deste destinatário (somados aos dados comuns). */
  data?: Record<string, unknown>;
};

export type BatchSendSummary = {
  sent: number;
  simulated: number;
  failed: number;
  /** Primeiro erro encontrado, para mostrar ao admin. */
  firstError?: string;
};

/**
 * Envio em lote com o mesmo template para muitos destinatários (campanhas,
 * convites em massa). Carrega configuração, template e variáveis de perfil uma
 * vez só, interpola por destinatário e usa o endpoint de lote do Resend — o
 * envio um a um em paralelo estourava o limite de requisições por segundo.
 */
export async function sendConfiguredEmailBatch(
  db: DB,
  common: Omit<EmailSendPayload, "to" | "userId">,
  recipients: BatchRecipient[],
  options: SendConfiguredEmailOptions = {},
): Promise<BatchSendSummary> {
  const summary: BatchSendSummary = { sent: 0, simulated: 0, failed: 0 };
  if (!recipients.length) return summary;

  const config = { ...(await getResendServerConfig(db)), ...(options.configOverride ?? {}) };
  const blocked = options.ignoreCategory ? null : emailCategoryBlockReason(common.template, config.categories);
  if (blocked) {
    await persistEmailLogs(db, recipients.map((r) => logRow({ ...common, to: r.to }, { success: false, error: blocked })));
    return { ...summary, failed: recipients.length, firstError: blocked };
  }

  const [template, variablesByUser, brand] = await Promise.all([
    common.template && common.template !== "test" ? getEmailTemplate(db, common.template) : Promise.resolve(null),
    getUsersTemplateVariables(db, recipients.flatMap((r) => (r.userId ? [r.userId] : []))),
    brandVariables(db),
  ]);

  const rendered = recipients.map((recipient) => renderPayload(
    { ...common, to: recipient.to, userId: recipient.userId },
    template,
    {
      ...brand,
      ...common.data,
      ...recipient.data,
      userVariables: recipient.userId ? variablesByUser.get(recipient.userId) ?? {} : {},
    },
  ));

  const results = await sendEmailBatch(
    rendered.map((payload) => ({
      to: payload.to as string,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      tags: payload.tags,
    })),
    config,
  );

  results.forEach((result) => {
    if (!result.success) {
      summary.failed += 1;
      summary.firstError ??= result.error;
    } else if (result.simulated) summary.simulated += 1;
    else summary.sent += 1;
  });

  await persistEmailLogs(db, rendered.map((payload, index) => logRow(payload, results[index])));
  return summary;
}

/**
 * Variante para Server Actions e webhooks que não carregam uma sessão admin.
 * Sem service role, ainda permite a configuração por env var, mas não tenta
 * burlar a RLS da tabela de integrações.
 */
export async function sendPlatformEmail(payload: EmailSendPayload): Promise<EmailSendResponse> {
  if (!getSupabaseServiceRoleKey()) {
    const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
    if (!apiKey) {
      return {
        success: false,
        error:
          "O servidor precisa de SUPABASE_SERVICE_ROLE_KEY para ler a integração do Resend ou de RESEND_API_KEY configurada diretamente.",
      };
    }

    return sendEmail(payload, {
      apiKey,
      fromEmail: process.env.RESEND_FROM_EMAIL ?? DEFAULT_RESEND_CONFIG.fromEmail,
      fromName: process.env.RESEND_FROM_NAME ?? DEFAULT_RESEND_CONFIG.fromName,
    });
  }

  return sendConfiguredEmail(createAdminClient(), payload);
}
