import { EmailLog, EmailSendPayload, EmailSendResponse, EmailTemplateType, ResendConfig } from "@/types/resend";
import { generateEmailHtml } from "./emailTemplates";

const RESEND_CONFIG_KEY = "@smartlms:resend_config";
const RESEND_LOGS_KEY = "@smartlms:resend_logs";

export const DEFAULT_RESEND_CONFIG: ResendConfig = {
  apiKey: "",
  fromName: "Smart LMS",
  fromEmail: "onboarding@resend.dev",
  replyTo: "suporte@smartlms.com",
  enabled: true,
  categories: {
    platform: {
      welcome: true,
      passwordReset: true,
      courseEnrollment: true,
      certificateIssued: true,
      subscriptionConfirmation: true,
      orgInvite: true,
    },
    notifications: {
      newContent: true,
      communityReplies: true,
      broadcasts: true,
      inactivityReengagement: true,
    },
  },
  domainStatus: "not_started",
  updatedAt: new Date().toISOString(),
};

/** Nome amigável de cada categoria, para a mensagem de envio bloqueado. */
const CATEGORY_LABELS: Partial<Record<EmailTemplateType, string>> = {
  welcome: "Boas-vindas",
  password_reset: "Recuperação de Senha",
  course_enrollment: "Matrícula em Cursos",
  certificate: "Certificado",
  subscription: "Assinatura Confirmada",
  org_invite: "Convite de Empresa",
  notification: "Notificações (Broadcasts)",
  inactivity: "Reengajamento",
};

/**
 * Se o tipo de e-mail está liberado pelos liga/desliga da integração Resend.
 *
 * Devolve a mensagem de bloqueio, ou `null` quando pode enviar. `test` e envios
 * sem template (HTML avulso) não têm categoria e sempre passam.
 */
export function emailCategoryBlockReason(
  template: EmailTemplateType | undefined,
  categories: ResendConfig["categories"],
): string | null {
  if (!template || template === "test") return null;
  const { platform, notifications } = categories;
  const enabled: Record<EmailTemplateType, boolean> = {
    welcome: platform.welcome,
    password_reset: platform.passwordReset,
    course_enrollment: platform.courseEnrollment,
    certificate: platform.certificateIssued,
    subscription: platform.subscriptionConfirmation,
    org_invite: platform.orgInvite,
    notification: notifications.broadcasts,
    inactivity: notifications.inactivityReengagement,
    test: true,
  };
  if (enabled[template] !== false) return null;
  return `Disparos de ${CATEGORY_LABELS[template] ?? template} estão desativados nas configurações do Resend.`;
}

// In-memory cache for server-side execution
let serverConfig: ResendConfig = { ...DEFAULT_RESEND_CONFIG };
let serverLogs: EmailLog[] = [];

export function getResendConfig(): ResendConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(RESEND_CONFIG_KEY);
      if (stored) {
        return { ...DEFAULT_RESEND_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Erro ao ler configuração do Resend do localStorage:", e);
    }
  }

  // Check if environment variables exist on server
  if (process.env.RESEND_API_KEY) {
    return {
      ...serverConfig,
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || serverConfig.fromEmail,
      fromName: process.env.RESEND_FROM_NAME || serverConfig.fromName,
    };
  }

  return serverConfig;
}

export function saveResendConfig(config: Partial<ResendConfig>): ResendConfig {
  const current = getResendConfig();
  const updated: ResendConfig = {
    ...current,
    ...config,
    categories: {
      platform: {
        ...current.categories.platform,
        ...(config.categories?.platform || {}),
      },
      notifications: {
        ...current.categories.notifications,
        ...(config.categories?.notifications || {}),
      },
    },
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(RESEND_CONFIG_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar configuração do Resend no localStorage:", e);
    }
  }

  serverConfig = updated;
  return updated;
}

export function getEmailLogs(): EmailLog[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(RESEND_LOGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Erro ao ler logs de e-mail:", e);
    }
  }
  return serverLogs;
}

export function addEmailLog(log: Omit<EmailLog, "id" | "createdAt">): EmailLog {
  const newLog: EmailLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const current = getEmailLogs();
      const updated = [newLog, ...current].slice(0, 100); // keep last 100
      localStorage.setItem(RESEND_LOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar log de e-mail:", e);
    }
  }

  serverLogs = [newLog, ...serverLogs].slice(0, 100);
  return newLog;
}

export function clearEmailLogs(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(RESEND_LOGS_KEY);
  }
  serverLogs = [];
}

export async function validateResendApiKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, message: "A chave de API não foi informada." };
  }

  const cleanKey = apiKey.trim();
  if (!cleanKey.startsWith("re_")) {
    return { valid: false, message: "Chave do Resend inválida (deve começar com 're_')." };
  }

  try {
    const res = await fetch("https://api.resend.com/api-keys", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    if (res.ok) {
      return { valid: true, message: "Chave de API validada com sucesso no Resend!" };
    }

    // If endpoint returns 401 or other status
    const data = await res.json().catch(() => ({}));
    return {
      valid: false,
      message: data.message || `Erro de autenticação no Resend (HTTP ${res.status}).`,
    };
  } catch (_err: unknown) {
    // If running in an environment without internet access or timeout
    return {
      valid: true,
      message: "Formato de chave aceito (re_...). Validação online indisponível no momento.",
    };
  }
}

export async function getResendDomains(apiKey: string): Promise<{ success: boolean; domains: any[]; message?: string }> {
  if (!apiKey || typeof apiKey !== "string") {
    return { success: false, domains: [], message: "A chave de API não foi informada." };
  }

  const cleanKey = apiKey.trim();
  if (!cleanKey.startsWith("re_")) {
    return { success: false, domains: [], message: "Chave do Resend inválida (deve começar com 're_')." };
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.data) {
      return { success: true, domains: data.data };
    }

    return {
      success: false,
      domains: [],
      message: data.message || `Erro ao buscar domínios no Resend (HTTP ${res.status}).`,
    };
  } catch (_err: unknown) {
    return {
      success: false,
      domains: [],
      message: "Falha na conexão com a API do Resend.",
    };
  }
}


/** Um e-mail já resolvido (assunto e HTML prontos) para o envio em lote. */
export type BatchEmailItem = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  tags?: { name: string; value: string }[];
};

/** Limite do endpoint `/emails/batch` do Resend. */
export const RESEND_BATCH_SIZE = 100;
/** Pausa entre chamadas: o Resend limita requisições por segundo por conta. */
const RESEND_BATCH_PAUSE_MS = 600;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Envia vários e-mails pelo endpoint de lote do Resend (até 100 por chamada),
 * uma chamada por vez. Com 429 espera o `retry-after` e tenta de novo uma vez.
 * Devolve um resultado por item, na mesma ordem. Sem chave `re_`, simula.
 */
export async function sendEmailBatch(
  items: BatchEmailItem[],
  config: Pick<ResendConfig, "apiKey" | "fromName" | "fromEmail" | "replyTo" | "enabled">,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailSendResponse[]> {
  if (!config.enabled) {
    const error = "O envio de e-mails via Resend está desabilitado nas configurações.";
    return items.map(() => ({ success: false, error }));
  }

  const apiKey = config.apiKey?.trim();
  if (!apiKey || !apiKey.startsWith("re_")) {
    return items.map(() => ({
      success: true,
      simulated: true,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      message: "E-mail simulado (Resend sem chave de API).",
    }));
  }

  const results: EmailSendResponse[] = [];
  for (let start = 0; start < items.length; start += RESEND_BATCH_SIZE) {
    if (start > 0) await sleep(RESEND_BATCH_PAUSE_MS);
    const chunk = items.slice(start, start + RESEND_BATCH_SIZE);
    const body = JSON.stringify(chunk.map((item) => ({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: [item.to],
      subject: item.subject,
      html: item.html,
      text: item.text,
      reply_to: config.replyTo || undefined,
      tags: item.tags,
    })));

    const post = () => fetchImpl("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body,
    });

    try {
      let res = await post();
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000);
        res = await post();
      }
      const data = await res.json().catch(() => ({}));
      const ids: { id?: string }[] = Array.isArray(data?.data) ? data.data : [];
      if (res.ok) {
        chunk.forEach((_, index) => {
          const id = ids[index]?.id;
          results.push(id
            ? { success: true, id, message: "E-mail enviado via Resend." }
            : { success: false, error: "Resend não devolveu id para este destinatário." });
        });
      } else {
        const error = data?.message || `Erro ao enviar lote (HTTP ${res.status})`;
        chunk.forEach(() => results.push({ success: false, error }));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha na conexão com a API do Resend";
      chunk.forEach(() => results.push({ success: false, error: message }));
    }
  }
  return results;
}

export async function sendEmail(
  payload: EmailSendPayload,
  configOverride?: Partial<ResendConfig>
): Promise<EmailSendResponse> {
  const config = { ...getResendConfig(), ...(configOverride || {}) };

  if (!config.enabled) {
    return {
      success: false,
      error: "O envio de e-mails via Resend está desabilitado nas configurações.",
    };
  }

  // Determine subject and HTML
  let finalSubject = payload.subject;
  let finalHtml = payload.html;

  if (payload.template) {
    const generated = generateEmailHtml(payload.template, {
      ...payload.data,
      appName: config.fromName,
    });
    if (!finalSubject) {
      finalSubject = generated.subject;
    }
    if (!finalHtml) {
      finalHtml = generated.html;
    }
  }

  if (!finalHtml && !payload.text) {
    return {
      success: false,
      error: "Conteúdo do e-mail não fornecido (HTML ou texto obrigatório).",
    };
  }

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const primaryRecipient = recipients[0] || "desconhecido";

  // Check if live API Key is present
  const apiKey = config.apiKey?.trim();

  if (apiKey && apiKey.startsWith("re_")) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${config.fromName} <${config.fromEmail}>`,
          to: recipients,
          subject: finalSubject,
          html: finalHtml,
          text: payload.text,
          reply_to: config.replyTo || undefined,
          tags: payload.tags,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.id) {
        addEmailLog({
          to: primaryRecipient,
          subject: finalSubject,
          template: payload.template || "custom",
          status: "sent",
          resendId: data.id,
        });

        return {
          success: true,
          id: data.id,
          message: "E-mail enviado com sucesso via Resend!",
        };
      } else {
        const errorMsg = data.message || `Erro ao enviar e-mail (HTTP ${res.status})`;
        addEmailLog({
          to: primaryRecipient,
          subject: finalSubject,
          template: payload.template || "custom",
          status: "failed",
          error: errorMsg,
        });

        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Falha na conexão com a API do Resend";
      addEmailLog({
        to: primaryRecipient,
        subject: finalSubject,
        template: payload.template || "custom",
        status: "failed",
        error: errorMsg,
      });

      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  // Simulation mode (Sandbox / Dev without active API key)
  const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  addEmailLog({
    to: primaryRecipient,
    subject: finalSubject,
    template: payload.template || "custom",
    status: "simulated",
    resendId: simulatedId,
  });

  return {
    success: true,
    id: simulatedId,
    simulated: true,
    message: "E-mail simulado com sucesso (Modo Sandbox). Configure a chave de API para envios reais.",
  };
}
