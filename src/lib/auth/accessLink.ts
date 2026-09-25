import "server-only";

import type { DB } from "@/lib/data/types";
import { getSiteUrl } from "@/lib/siteUrl";

export type AccessLinkKind = "magiclink" | "recovery";

/**
 * Origem pública da aplicação para links que saem por e-mail.
 *
 * Em produção é sempre o domínio canônico (`getSiteUrl`): o webhook da Hotmart
 * pode estar apontado para `*.vercel.app`, e o aluno não deve receber esse
 * endereço. Fora de produção vale o host que atendeu a requisição, para o
 * link de teste voltar ao mesmo ambiente (preview, localhost).
 */
export function resolveAppOrigin(requestOrigin?: string | null): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured || process.env.VERCEL_ENV === "production" || !requestOrigin?.trim()) {
    return getSiteUrl();
  }
  return requestOrigin.trim().replace(/\/$/, "");
}

/**
 * Gera um link de acesso de primeira parte para ir no corpo de um e-mail do Resend.
 *
 * `auth.admin.generateLink()` **não envia e-mail** — só devolve o `hashed_token`
 * e o `action_link`. O `action_link` cru passa pelo `/verify` do Supabase e cai
 * na Site URL, sem sessão utilizável pelo app (fluxo implícito, tokens no hash).
 * Por isso montamos `/auth/confirm?token_hash=…&type=…`, que consome o token via
 * `verifyOtp` no servidor e funciona em qualquer navegador — inclusive quando a
 * pessoa abre o e-mail no celular. Recovery segue para "definir nova senha".
 *
 * Sem `hashed_token`, cai no `action_link` do Supabase.
 */
export async function generateFirstPartyAuthLink(
  db: DB,
  opts: { kind: AccessLinkKind; email: string; next: string; origin?: string | null },
): Promise<{ link: string | null; error: string | null }> {
  const { data, error } = await db.auth.admin.generateLink({
    type: opts.kind,
    email: opts.email,
  });

  const properties = data?.properties;
  if (error || !properties) {
    return { link: null, error: error?.message ?? "Não foi possível gerar o link de acesso." };
  }

  const origin = resolveAppOrigin(opts.origin);
  const { hashed_token, action_link } = properties;
  const link = hashed_token
    ? `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashed_token)}` +
      `&type=${opts.kind}&next=${encodeURIComponent(opts.next)}`
    : action_link ?? null;

  return { link, error: link ? null : "Link de acesso vazio." };
}
