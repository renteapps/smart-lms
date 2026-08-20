import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey, getSupabaseAnonKey } from "./env";

export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const apiKey = serviceRoleKey || getSupabaseAnonKey();

  if (!serviceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not set. Admin client falling back to anon key.");
  }

  return createClient(supabaseUrl, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
