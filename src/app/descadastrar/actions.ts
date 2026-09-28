"use server";

import { isOptOutCategory, recordOptOut, verifyUnsubscribe } from "@/lib/emailUnsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

/**
 * Confirma o descadastro pedido pela página /descadastrar. A autorização é o
 * token HMAC do link (o e-mail pode ser aberto sem login); a gravação usa o
 * service role porque `email_opt_outs` não aceita escrita pelo cliente.
 */
export async function confirmUnsubscribeAction(
  userId: string,
  category: string,
  token: string,
): Promise<{ ok: boolean }> {
  if (!isOptOutCategory(category) || !verifyUnsubscribe(userId, category, token)) return { ok: false };
  if (!getSupabaseServiceRoleKey()) return { ok: false };
  return { ok: await recordOptOut(createAdminClient(), userId, category) };
}
