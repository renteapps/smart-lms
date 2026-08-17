/**
 * Normaliza e valida URLs e chaves do Supabase.
 * Previne falhas comuns como:
 * - Barras no final (trailing slash: https://xyz.supabase.co/)
 * - Sufixo /rest/v1 ou /auth/v1 colados acidentalmente da Dashboard do Supabase
 * - Aspas ou espaços adicionais nas variáveis de ambiente da Vercel
 */

export function cleanSupabaseUrl(url?: string): string {
  if (!url) return "";
  let cleaned = url.trim().replace(/^["']|["']$/g, ""); // remove aspas
  cleaned = cleaned.replace(/\/+$/, ""); // remove barras no final
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, ""); // remove /rest/v1 acidental
  cleaned = cleaned.replace(/\/auth\/v1\/?$/i, ""); // remove /auth/v1 acidental
  return cleaned;
}

export function cleanSupabaseKey(key?: string): string {
  if (!key) return "";
  return key.trim().replace(/^["']|["']$/g, "");
}

export function getSupabaseUrl(): string {
  return cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return cleanSupabaseKey(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseServiceRoleKey(): string {
  return cleanSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
