"use server";

import { getSessionUser } from "@/lib/supabase/auth";
import { SEARCH_PAGE_SIZE } from "@/lib/searchQueryState";
import {
  ALL_CATEGORIES,
  EMPTY_COUNTS,
  emptySearchResponse,
  SEARCH_RESULT_TYPES,
  SEARCH_SORT_OPTIONS,
  type SearchCategoryFacet,
  type SearchCountsByType,
  type SearchRequest,
  type SearchResponse,
  type SearchResultItem,
  type SearchResultType,
  type SearchSuggestion,
} from "@/types/search";

/**
 * Camada fina sobre `search_unified`.
 *
 * Toda a busca — pontuação, facetas, ordenação, paginação e recorte de acesso
 * — acontece no Postgres, em uma ida só (ver
 * `supabase/migrations/20260823140000_search_engine_v2.sql`). O que sobra aqui
 * é o que de fato é responsabilidade da aplicação: validar a entrada,
 * converter `snake_case` do banco no formato da tela e nunca deixar um erro de
 * busca derrubar a página.
 */

const MAX_QUERY_LENGTH = 160;

function clampQuery(value: string | undefined): string {
  return (value ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toCounts(raw: unknown): SearchCountsByType {
  if (!isRecord(raw)) return { ...EMPTY_COUNTS };

  const read = (key: keyof SearchCountsByType): number => {
    const value = raw[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };

  return {
    all: read("all"),
    course: read("course"),
    lesson: read("lesson"),
    agent: read("agent"),
    article: read("article"),
    note: read("note"),
  };
}

function toCategories(raw: unknown): SearchCategoryFacet[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): SearchCategoryFacet[] => {
    if (!isRecord(entry)) return [];
    const value = typeof entry.value === "string" ? entry.value : null;
    if (!value) return [];
    const count = typeof entry.count === "number" ? entry.count : 0;
    return [{ value, count }];
  });
}

function toItems(raw: unknown): SearchResultItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): SearchResultItem[] => {
    if (!isRecord(entry)) return [];

    const type = entry.type;
    if (typeof type !== "string" || !(SEARCH_RESULT_TYPES as readonly string[]).includes(type)) {
      return [];
    }

    const id = typeof entry.id === "string" ? entry.id : null;
    const title = typeof entry.title === "string" ? entry.title : null;
    const url = typeof entry.url === "string" ? entry.url : null;
    if (!id || !title || !url) return [];

    return [
      {
        id,
        type: type as SearchResultType,
        title,
        url,
        description: typeof entry.description === "string" ? entry.description : "",
        category: typeof entry.category === "string" ? entry.category : undefined,
        score: typeof entry.score === "number" ? entry.score : undefined,
        hasAccess: typeof entry.hasAccess === "boolean" ? entry.hasAccess : undefined,
        snippet: typeof entry.snippet === "string" ? entry.snippet : null,
        metadata: isRecord(entry.metadata) ? (entry.metadata as SearchResultItem["metadata"]) : undefined,
      },
    ];
  });
}

function toResponse(raw: unknown, fallbackQuery: string, pageSize: number): SearchResponse {
  if (!isRecord(raw)) return emptySearchResponse(fallbackQuery, pageSize);

  const page = isRecord(raw.page) ? raw.page : {};

  return {
    query: typeof raw.query === "string" ? raw.query : fallbackQuery,
    items: toItems(raw.items),
    totalCount: typeof raw.totalCount === "number" ? raw.totalCount : 0,
    countsByType: toCounts(raw.countsByType),
    categories: toCategories(raw.categories),
    didYouMean: raw.didYouMean === true,
    page: {
      size: typeof page.size === "number" ? page.size : pageSize,
      offset: typeof page.offset === "number" ? page.offset : 0,
      hasMore: page.hasMore === true,
    },
  };
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

    return toResponse(data, query, pageSize);
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
    if (!Array.isArray(data)) return [];

    return data.flatMap((entry): SearchSuggestion[] => {
      if (!isRecord(entry)) return [];
      const title = typeof entry.title === "string" ? entry.title : null;
      const url = typeof entry.url === "string" ? entry.url : null;
      const type = typeof entry.type === "string" ? entry.type : null;
      if (!title || !url || !type || !(SEARCH_RESULT_TYPES as readonly string[]).includes(type)) {
        return [];
      }
      return [
        {
          title,
          url,
          type: type as SearchResultType,
          category: typeof entry.category === "string" ? entry.category : undefined,
        },
      ];
    });
  } catch (error) {
    console.error("[search] search_suggest falhou:", error);
    return [];
  }
}
