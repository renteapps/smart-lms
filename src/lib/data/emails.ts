import type { CustomEmailTemplate, EmailLog, EmailTemplateType, ResendConfig } from "@/types/resend";
import { getDefaultTemplateDefinitions } from "@/lib/emailTemplates";
import { DEFAULT_RESEND_CONFIG } from "@/lib/resendService";
import { logQueryError, type DB, type Row } from "./types";

/**
 * Templates, logs e configuração de e-mail.
 *
 * As definições padrão continuam no código (`emailTemplates.ts`): são o
 * conteúdo de fábrica de um template, não um dado editável. O que o banco
 * guarda é a **customização** — e é ela que vence na hora de renderizar.
 */

function mapTemplateRow(row: Row, base: CustomEmailTemplate): CustomEmailTemplate {
  return {
    ...base,
    subject: row.subject ?? base.subject,
    previewText: row.preview_text ?? base.previewText,
    html: row.html ?? base.html,
    isCustomized: row.is_customized ?? true,
    updatedAt: row.updated_at,
  };
}

export async function getEmailTemplates(db: DB): Promise<CustomEmailTemplate[]> {
  const defaults = getDefaultTemplateDefinitions();
  const { data, error } = await db
    .from("email_templates")
    .select("type, subject, preview_text, html, is_customized, updated_at");

  logQueryError("getEmailTemplates", error);
  const overrides = new Map((data ?? []).map((row: Row) => [row.type, row]));

  return defaults.map((template) => {
    const override = overrides.get(template.type);
    return override ? mapTemplateRow(override, template) : template;
  });
}

export async function getEmailTemplate(
  db: DB,
  type: EmailTemplateType,
): Promise<CustomEmailTemplate | null> {
  const base = getDefaultTemplateDefinitions().find((template) => template.type === type);
  if (!base) return null;

  const { data, error } = await db
    .from("email_templates")
    .select("type, subject, preview_text, html, is_customized, updated_at")
    .eq("type", type)
    .maybeSingle();

  logQueryError("getEmailTemplate", error);
  return data ? mapTemplateRow(data, base) : base;
}

export async function getEmailLogs(db: DB, limit = 200): Promise<EmailLog[]> {
  const { data, error } = await db
    .from("email_logs")
    .select("id, recipient, subject, template, status, resend_id, error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  logQueryError("getEmailLogs", error);

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    to: row.recipient,
    subject: row.subject,
    template: row.template as EmailLog["template"],
    status: row.status as EmailLog["status"],
    resendId: row.resend_id ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
  }));
}

/**
 * Configuração do Resend.
 *
 * A chave de API fica em `secrets`, cuja leitura o RLS restringe a admins — por
 * isso nunca é devolvida para o cliente aqui; a UI só precisa saber se existe.
 */
export async function getResendConfig(db: DB): Promise<ResendConfig & { hasApiKey: boolean }> {
  const { data, error } = await db
    .from("integrations")
    .select("enabled, config, secrets, status, updated_at")
    .eq("slug", "resend")
    .maybeSingle();

  logQueryError("getResendConfig", error);
  if (!data) return { ...DEFAULT_RESEND_CONFIG, apiKey: "", hasApiKey: false };

  const config = (data.config ?? {}) as Partial<ResendConfig>;
  return {
    ...DEFAULT_RESEND_CONFIG,
    ...config,
    categories: {
      platform: { ...DEFAULT_RESEND_CONFIG.categories.platform, ...config.categories?.platform },
      notifications: {
        ...DEFAULT_RESEND_CONFIG.categories.notifications,
        ...config.categories?.notifications,
      },
    },
    apiKey: "",
    enabled: data.enabled ?? false,
    domainStatus: (data.status ?? "not_started") as ResendConfig["domainStatus"],
    updatedAt: data.updated_at,
    hasApiKey: !!data.secrets?.apiKey,
  };
}

/** Só no servidor: a chave em claro, para efetivamente enviar o e-mail. */
export async function getResendApiKey(db: DB): Promise<string | null> {
  const { data, error } = await db
    .from("integrations")
    .select("secrets")
    .eq("slug", "resend")
    .maybeSingle();

  logQueryError("getResendApiKey", error);
  return data?.secrets?.apiKey ?? null;
}

// ---------------------------------------------------------------------------
// Integrações genéricas
// ---------------------------------------------------------------------------

export type Integration = {
  slug: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  status: string;
  hasSecrets: boolean;
  updatedAt: string;
};

export async function getIntegrations(db: DB): Promise<Integration[]> {
  const { data, error } = await db
    .from("integrations")
    .select("slug, name, enabled, config, secrets, status, updated_at")
    .order("name", { ascending: true });

  logQueryError("getIntegrations", error);

  return (data ?? []).map((row: Row) => ({
    slug: row.slug,
    name: row.name,
    enabled: row.enabled ?? false,
    config: (row.config ?? {}) as Record<string, unknown>,
    status: row.status ?? "not_started",
    hasSecrets: Object.keys(row.secrets ?? {}).length > 0,
    updatedAt: row.updated_at,
  }));
}

export async function getIntegration(db: DB, slug: string): Promise<Integration | null> {
  const integrations = await getIntegrations(db);
  return integrations.find((item) => item.slug === slug) ?? null;
}
