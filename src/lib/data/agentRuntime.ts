import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import type { DB } from "./types";

/**
 * Client que lê a configuração interna do agente (prompt, contexto, arquivos).
 * Essas colunas não são legíveis pelo papel `authenticated`; sem service role
 * (dev local) cai na própria sessão, que só funciona para admin.
 */
export function agentRuntimeClient(sessionDb: DB): DB {
  return getSupabaseServiceRoleKey() ? (createAdminClient() as unknown as DB) : sessionDb;
}
