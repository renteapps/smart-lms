import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Todas as funções de `lib/data` recebem o client em vez de criá-lo.
 *
 * É o que permite a mesma query rodar num Server Component (client de cookies),
 * numa Server Action e no browser — sem duplicar a query por ambiente.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = SupabaseClient<any, "public", any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

/**
 * Erros de leitura não derrubam a tela: a UI já tem estado vazio para tudo.
 * Erros de escrita, ao contrário, sobem — quem grava precisa saber se falhou.
 */
export function logQueryError(context: string, error: { message: string } | null) {
  if (error) {
    console.error(`[data:${context}]`, error.message);
  }
}
