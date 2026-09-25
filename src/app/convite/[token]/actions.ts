"use server";

import { getSessionUser } from "@/lib/supabase/auth";

export type AcceptInviteState =
  | "accepted"
  | "already_member"
  | "expired"
  | "wrong_email"
  | "no_seats"
  | "invalid"
  | "unauthenticated"
  | "error";

/**
 * Aceita o convite de empresa com a sessão atual. Toda a regra (e-mail
 * convidado = e-mail logado, prazo, assentos, idempotência) mora na função
 * `accept_org_invite` do banco — aqui só se repassa o resultado.
 */
export async function acceptInviteAction(token: string): Promise<{ state: AcceptInviteState; email?: string }> {
  const { supabase, user } = await getSessionUser();
  if (!user) return { state: "unauthenticated" };

  const { data, error } = await supabase.rpc("accept_org_invite", { p_token: token });
  if (error) {
    console.error("[convite] accept_org_invite falhou", error.message);
    return { state: "error" };
  }
  const result = (data ?? {}) as { state?: AcceptInviteState; email?: string };
  return { state: result.state ?? "error", email: result.email };
}
