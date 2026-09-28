import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { DB } from "@/lib/data/types";
import { getSiteUrl } from "@/lib/siteUrl";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

/** Categorias de e-mail que aceitam descadastro. Avisos da conta não entram aqui. */
export const OPT_OUT_CATEGORIES = ["winback"] as const;
export type OptOutCategory = (typeof OPT_OUT_CATEGORIES)[number];

export function isOptOutCategory(value: unknown): value is OptOutCategory {
  return typeof value === "string" && (OPT_OUT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Chave do token de descadastro.
 *
 * Derivada do service role (ou de EMAIL_LINK_SECRET, se definida) para não
 * exigir mais uma variável de ambiente. Trocar a chave invalida os links já
 * enviados — aceitável: o próximo e-mail leva um link novo.
 */
function signingKey(): string | null {
  const base = process.env.EMAIL_LINK_SECRET?.trim() || getSupabaseServiceRoleKey();
  return base ? createHash("sha256").update(`email-unsubscribe:${base}`).digest("hex") : null;
}

export function signUnsubscribe(userId: string, category: OptOutCategory): string | null {
  const key = signingKey();
  if (!key) return null;
  return createHmac("sha256", key).update(`${userId}:${category}`).digest("base64url");
}

/** Confere o token sem vazar tempo de comparação. */
export function verifyUnsubscribe(userId: string, category: string, token: string): boolean {
  if (!userId || !token || !isOptOutCategory(category)) return false;
  const expected = signUnsubscribe(userId, category);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function unsubscribeQuery(userId: string, category: OptOutCategory): string | null {
  const token = signUnsubscribe(userId, category);
  if (!token) return null;
  return new URLSearchParams({ u: userId, c: category, t: token }).toString();
}

/**
 * Link da página de descadastro (com botão de confirmação) e cabeçalhos
 * List-Unsubscribe para o botão nativo de descadastro do Gmail/Apple Mail.
 */
export function buildUnsubscribe(userId: string, category: OptOutCategory): {
  pageUrl: string;
  headers: Record<string, string>;
} | null {
  const query = unsubscribeQuery(userId, category);
  if (!query) return null;
  const site = getSiteUrl();
  return {
    pageUrl: `${site}/descadastrar?${query}`,
    headers: {
      "List-Unsubscribe": `<${site}/api/email/unsubscribe?${query}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** Grava o descadastro (idempotente). Precisa de cliente com service role. */
export async function recordOptOut(db: DB, userId: string, category: OptOutCategory): Promise<boolean> {
  const { error } = await db
    .from("email_opt_outs")
    .upsert({ user_id: userId, category }, { onConflict: "user_id,category", ignoreDuplicates: true });
  if (error) console.error("[email:unsubscribe] falha ao gravar descadastro", error.message);
  return !error;
}
