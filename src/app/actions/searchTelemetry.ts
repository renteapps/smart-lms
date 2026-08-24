"use server";

import { getSessionUser } from "@/lib/supabase/auth";
import { ALL_CATEGORIES, type SearchResultType, type SearchTabType } from "@/types/search";

/**
 * Registro do que é buscado na plataforma.
 *
 * Serve a duas perguntas que nenhuma outra tabela responde:
 *
 *  - **o que procuram e não existe** (`result_count = 0`) — a lista, ordenada
 *    por demanda real, do que falta no catálogo;
 *  - **o que existe e ninguém abre** (busca sem clique) — problema de ranking
 *    ou de título, que é bem diferente de falta de conteúdo.
 *
 * Regra de ouro daqui: **telemetria nunca derruba a busca.** Toda falha é
 * engolida e vira `null`. Quem chama não espera a resposta para pintar a tela.
 */

export interface SearchEventInput {
  query: string;
  resultCount: number;
  type: SearchTabType;
  category: string;
  didYouMean: boolean;
}

/** Devolve o id do evento, que o clique usa depois para se ligar à busca. */
export async function logSearchEvent(input: SearchEventInput): Promise<string | null> {
  const query = input.query.trim();
  if (!query) return null;

  try {
    const { supabase, user } = await getSessionUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc("log_search_event", {
      p_query: query,
      p_result_count: Number.isFinite(input.resultCount) ? Math.max(input.resultCount, 0) : 0,
      p_filter_type: input.type ?? "all",
      p_filter_category: input.category && input.category !== ALL_CATEGORIES ? input.category : null,
      p_did_you_mean: Boolean(input.didYouMean),
    });

    if (error) throw error;
    return typeof data === "string" ? data : null;
  } catch (error) {
    console.error("[search] não foi possível registrar a busca:", error);
    return null;
  }
}

export interface SearchClickInput {
  eventId: string;
  documentId: string;
  documentType: SearchResultType;
  position: number;
}

/** Fecha o evento com o resultado que a pessoa abriu. */
export async function logSearchClick(input: SearchClickInput): Promise<void> {
  if (!input.eventId) return;

  try {
    const { supabase, user } = await getSessionUser();
    if (!user) return;

    const { error } = await supabase.rpc("log_search_click", {
      p_event_id: input.eventId,
      p_doc_id: input.documentId,
      p_doc_type: input.documentType,
      p_position: Math.max(input.position, 0),
    });

    if (error) throw error;
  } catch (error) {
    console.error("[search] não foi possível registrar o clique:", error);
  }
}

/**
 * Buscas recentes desta pessoa, vindas do servidor.
 *
 * O `localStorage` continua existindo para eco imediato — quem acabou de
 * buscar vê o termo na hora, sem esperar ida ao banco —, mas o histórico que
 * atravessa dispositivos vem daqui.
 */
export async function getRecentSearches(limit = 6): Promise<string[]> {
  try {
    const { supabase, user } = await getSessionUser();
    if (!user) return [];

    const { data, error } = await supabase.rpc("recent_searches", {
      max_results: Math.min(Math.max(limit, 1), 12),
    });

    if (error) throw error;
    if (!Array.isArray(data)) return [];

    return data.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");
  } catch (error) {
    console.error("[search] não foi possível ler o histórico:", error);
    return [];
  }
}
