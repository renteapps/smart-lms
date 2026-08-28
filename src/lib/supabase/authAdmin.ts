import { createAdminClient } from "./admin";
import { getSupabaseServiceRoleKey } from "./env";

export type AuthUserInfo = {
  /** Último login validado pelo Supabase Auth. */
  lastSignInAt: string | null;
  /** Criação da conta no Auth (pode divergir de `profiles.created_at`). */
  createdAt: string | null;
  /** Confirmação de e-mail, quando houver. */
  emailConfirmedAt: string | null;
};

/**
 * Lê metadados de sessão do Supabase Auth (schema `auth`, fora do PostgREST).
 *
 * Best-effort e sempre seguro de chamar: sem `SUPABASE_SERVICE_ROLE_KEY` a API
 * de admin não responde, então devolvemos `null` e quem chama usa outro sinal
 * (ex.: `profiles.last_access_at` ou a atividade de aula mais recente).
 */
export async function getAuthUserInfo(userId: string): Promise<AuthUserInfo | null> {
  if (!getSupabaseServiceRoleKey()) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) return null;

    return {
      lastSignInAt: data.user.last_sign_in_at ?? null,
      createdAt: data.user.created_at ?? null,
      emailConfirmedAt: data.user.email_confirmed_at ?? null,
    };
  } catch {
    return null;
  }
}
