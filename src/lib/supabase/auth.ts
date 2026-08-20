import { createClient } from "./server";

/**
 * Sessão do servidor para Server Components e Server Actions.
 *
 * Sempre `getUser()`, nunca `getSession()`: a sessão vem do cookie e é forjável,
 * enquanto `getUser()` valida a identidade contra o Supabase.
 */
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requireUser() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente para continuar.");
  return { supabase, user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser();

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin" && user.user_metadata?.role !== "admin") {
    throw new Error("Acesso restrito a administradores.");
  }

  const { getSupabaseServiceRoleKey } = await import("./env");
  const serviceRoleKey = getSupabaseServiceRoleKey();

  let adminClient = supabase;
  if (serviceRoleKey) {
    const { createAdminClient } = await import("./admin");
    adminClient = createAdminClient();
  }

  return { supabase, adminClient, user };
}
