"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendConfiguredEmail } from "@/lib/resendServer";

export async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin";
}

export type SupportActionResult = {
  success: boolean;
  message: string;
  /** Link pronto para o admin copiar e enviar por outro canal (WhatsApp, etc.). */
  magicLink?: string;
  /** `true` quando o e-mail chegou a ser despachado pelo Resend. */
  emailSent?: boolean;
};

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3888";
  const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "aluno(a)";
}

/** Corta a espera se o provedor de e-mail travar — o link já está pronto e não pode ficar refém do envio. */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * `admin.auth.admin.generateLink()` **não envia e-mail** — apenas devolve a URL e
 * o `hashed_token`. Quem entrega é o Resend, com os templates que já existem no
 * admin (mesmo caminho de `src/lib/billing/welcome.ts`).
 *
 * Montamos uma URL de primeira parte apontando para `/auth/confirm`, que consome
 * `token_hash` + `type` via `verifyOtp` — funciona independente do fluxo (PKCE ou
 * implícito). Se o token não vier, caímos no `action_link` cru do Supabase.
 *
 * O envio é best-effort: uma vez que o link foi gerado, ele **sempre** volta pro
 * admin, mesmo que o e-mail falhe, trave ou o Resend não esteja configurado.
 */
async function generateAndSendAccessLink(opts: {
  kind: "magiclink" | "recovery";
  userId: string;
  email: string;
  name?: string | null;
  next: string;
  template: "welcome" | "password_reset";
}): Promise<{ link: string | null; emailSent: boolean; error: string | null }> {
  const admin = createAdminClient();
  const origin = await getOrigin();

  const { data, error } = await admin.auth.admin.generateLink({
    type: opts.kind,
    email: opts.email,
  });

  const properties = data?.properties;
  if (error || !properties) {
    console.error("[support-actions] generateLink falhou", error?.message);
    return {
      link: null,
      emailSent: false,
      error: error?.message ?? "Não foi possível gerar o link de acesso.",
    };
  }

  const { hashed_token, action_link } = properties;
  const link = hashed_token
    ? `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashed_token)}` +
      `&type=${opts.kind}&next=${encodeURIComponent(opts.next)}`
    : action_link;

  const linkData =
    opts.kind === "recovery"
      ? { link_recuperacao: link, link_login: link }
      : { link_login: link };

  let sendError: string | null = null;
  let emailSent = false;

  try {
    const result = await withTimeout(
      sendConfiguredEmail(admin, {
        to: opts.email,
        userId: opts.userId,
        subject: "",
        template: opts.template,
        data: {
          nome: firstName(opts.name),
          email: opts.email,
          ...linkData,
        },
        tags: [{ name: "origem", value: "admin-suporte" }],
      }),
      12_000,
      { success: false, error: "Tempo esgotado ao contatar o provedor de e-mail." },
    );

    // `simulated` = Resend sem chave de API: nada saiu de fato.
    emailSent = result.success && !result.simulated;
    sendError = result.success
      ? result.simulated
        ? "Integração de e-mail (Resend) não configurada neste ambiente."
        : null
      : result.error ?? "Falha ao enviar o e-mail.";
  } catch (e) {
    sendError = e instanceof Error ? e.message : "Falha ao enviar o e-mail.";
  }

  if (sendError) {
    console.error("[support-actions] envio de e-mail falhou", sendError);
  }

  return { link, emailSent, error: sendError };
}

export async function resendAccessEmail(
  userId: string,
  email: string,
  name?: string,
): Promise<SupportActionResult> {
  if (!(await checkAdmin())) return { success: false, message: "Acesso negado." };

  const { link, emailSent, error } = await generateAndSendAccessLink({
    kind: "magiclink",
    userId,
    email,
    name,
    next: "/minha-trilha",
    template: "welcome",
  });

  if (!link) {
    return { success: false, message: error ?? "Erro ao enviar e-mail de acesso." };
  }

  return {
    success: true,
    magicLink: link,
    emailSent,
    message: emailSent
      ? `Link de acesso enviado para ${email}. Se não chegar, copie o link abaixo e envie por outro canal.`
      : `Link gerado, mas o e-mail não pôde ser enviado${error ? ` (${error})` : ""}. Copie o link abaixo e envie ao usuário.`,
  };
}

export async function resetUserPassword(
  userId: string,
  email: string,
  name?: string,
): Promise<SupportActionResult> {
  if (!(await checkAdmin())) return { success: false, message: "Acesso negado." };

  const { link, emailSent, error } = await generateAndSendAccessLink({
    kind: "recovery",
    userId,
    email,
    name,
    next: "/resetar-senha",
    template: "password_reset",
  });

  if (!link) {
    return { success: false, message: error ?? "Erro ao enviar link de redefinição de senha." };
  }

  return {
    success: true,
    magicLink: link,
    emailSent,
    message: emailSent
      ? `Link de redefinição enviado para ${email}. Se não chegar, copie o link abaixo e envie por outro canal.`
      : `Link gerado, mas o e-mail não pôde ser enviado${error ? ` (${error})` : ""}. Copie o link abaixo e envie ao usuário.`,
  };
}

export async function forceUserLogoff(userId: string): Promise<SupportActionResult> {
  if (!(await checkAdmin())) return { success: false, message: "Acesso negado." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.signOut(userId);

  if (error) {
    console.error("Error forcing logoff", error);
    return { success: false, message: "Erro ao forçar logoff." };
  }

  return { success: true, message: "Logoff forçado com sucesso! Todas as sessões foram encerradas." };
}

export async function updateUserConfig(userId: string, data: { status: string; role: string }) {
  if (!(await checkAdmin())) return { success: false, message: "Acesso negado." };

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      status: data.status,
      role: data.role
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user config", error);
    return { success: false, message: "Erro ao atualizar configurações." };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/admin/users/${userId}/configuracoes`);
  return { success: true, message: "Configurações atualizadas com sucesso!" };
}
