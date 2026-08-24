"use server";

import { getSessionUser } from "@/lib/supabase/auth";
import { parseSearchResponse, parseSuggestions } from "@/lib/searchResponse";
import { SEARCH_PAGE_SIZE } from "@/lib/searchQueryState";
import {
  ALL_CATEGORIES,
  emptySearchResponse,
  SEARCH_RESULT_TYPES,
  SEARCH_SORT_OPTIONS,
  type SearchRequest,
  type SearchResponse,
  type SearchSuggestion,
} from "@/types/search";

/**
 * Camada fina sobre `search_unified`.
 *
 * Toda a busca — pontuação, facetas, ordenação, paginação e recorte de acesso
 * — acontece no Postgres, em uma ida só (ver
 * `supabase/migrations/20260823140000_search_engine_v2.sql`). A conversão da
 * resposta vive em `searchResponse.ts`, que é puro e testável. Sobra aqui o
 * que de fato é do action: validar a entrada, chamar a RPC e nunca deixar um
 * erro de busca derrubar a página.
 */

const MAX_QUERY_LENGTH = 160;

function clampQuery(value: string | undefined): string {
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

export async function searchContent(request: SearchRequest): Promise<SearchResponse> {
  const query = clampQuery(request.query);
  const pageSize = Math.min(Math.max(request.pageSize ?? SEARCH_PAGE_SIZE, 1), 60);
  const page = Math.max(request.page ?? 1, 1);

  const type =
    request.type && (["all", ...SEARCH_RESULT_TYPES] as readonly string[]).includes(request.type)
      ? request.type
      : "all";
  const sort =
    request.sort && (SEARCH_SORT_OPTIONS as readonly string[]).includes(request.sort)
      ? request.sort
      : "relevance";
  const category = request.category && request.category !== ALL_CATEGORIES ? request.category : null;

  try {
    const { supabase } = await getSessionUser();

    const { data, error } = await supabase.rpc("search_unified", {
      query_text: query,
      filter_type: type,
      filter_category: category,
      sort_by: sort,
      page_size: pageSize,
      page_offset: (page - 1) * pageSize,
    });

    if (error) throw error;

    return parseSearchResponse(data, query, pageSize);
  } catch (error) {
    console.error("[search] search_unified falhou:", error);
    // A tela precisa continuar utilizável: melhor "nenhum resultado" com o
    // campo funcionando do que um erro que derruba a rota inteira.
    return emptySearchResponse(query, pageSize);
  }
}

export async function getSearchSuggestions(query: string, limit = 6): Promise<SearchSuggestion[]> {
  const term = clampQuery(query);
  if (term.length < 2) return [];

  try {
    const { supabase } = await getSessionUser();

    const { data, error } = await supabase.rpc("search_suggest", {
      query_text: term,
      max_results: Math.min(Math.max(limit, 1), 12),
    });

    if (error) throw error;
    return parseSuggestions(data);
  } catch (error) {
    console.error("[search] search_suggest falhou:", error);
    return [];
  }
}
