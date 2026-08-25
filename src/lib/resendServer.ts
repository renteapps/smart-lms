import "server-only";

import type { DB } from "@/lib/data/types";
import { getEmailTemplate } from "@/lib/data/emails";
import { interpolateVariables } from "@/lib/emailTemplates";
import { DEFAULT_RESEND_CONFIG, sendEmail } from "@/lib/resendService";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import type { EmailLog, EmailSendPayload, EmailSendResponse, ResendConfig } from "@/types/resend";

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

async function persistEmailLog(
  db: DB,
  payload: EmailSendPayload,
  result: EmailSendResponse,
): Promise<void> {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const status: EmailLog["status"] = result.success
    ? result.simulated
      ? "simulated"
      : "sent"
    : "failed";

  const { error } = await db.from("email_logs").insert({
    recipient: recipients[0] || "desconhecido",
    subject: payload.subject || "(sem assunto)",
    template: payload.template || "custom",
    status,
    resend_id: result.id ?? null,
    error: result.error ?? null,
  });

  if (error) {
    console.error("[resend:logs] Não foi possível persistir o envio:", error.message);
  }
}

/** Envia usando configuração e template persistidos, registrando o resultado. */
export async function sendConfiguredEmail(
  db: DB,
  payload: EmailSendPayload,
  configOverride?: Partial<ResendConfig>,
): Promise<EmailSendResponse> {
  const config = { ...(await getResendServerConfig(db)), ...(configOverride ?? {}) };
  let resolvedPayload = payload;

  if (payload.template && payload.template !== "test") {
    const template = await getEmailTemplate(db, payload.template);
    if (template) {
      const templateData = { ...payload.data, appName: config.fromName };
      resolvedPayload = {
        ...payload,
        subject: payload.subject || interpolateVariables(template.subject, templateData),
        html: payload.html || interpolateVariables(template.html, templateData),
      };
    }
  }

  const result = await sendEmail(resolvedPayload, config);
  await persistEmailLog(db, resolvedPayload, result);
  return result;
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
