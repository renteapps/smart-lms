import {
  EMPTY_COUNTS,
  emptySearchResponse,
  SEARCH_RESULT_TYPES,
  type SearchCategoryFacet,
  type SearchCountsByType,
  type SearchResponse,
  type SearchResultItem,
  type SearchResultType,
  type SearchSuggestion,
} from "@/types/search";

/**
 * Conversão do `jsonb` que vem do Postgres para o formato da tela.
 *
 * Mora fora do server action de propósito: é aqui que uma resposta malformada
 * vira erro silencioso na interface, e função pura é o que permite testar
 * esses cantos sem subir banco nem servidor. O action fica sendo só a chamada
 * RPC mais o tratamento de falha.
 *
 * A postura é de **fronteira desconfiada**: o que não tem a forma esperada é
 * descartado item a item, em vez de derrubar a resposta inteira. Uma aula com
 * `url` nula não pode apagar as outras vinte da lista.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSearchResultType(value: unknown): value is SearchResultType {
  return typeof value === "string" && (SEARCH_RESULT_TYPES as readonly string[]).includes(value);
}

export function parseCounts(raw: unknown): SearchCountsByType {
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

export function parseCategories(raw: unknown): SearchCategoryFacet[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): SearchCategoryFacet[] => {
    if (!isRecord(entry)) return [];
    const value = typeof entry.value === "string" ? entry.value : null;
    if (!value) return [];
    return [{ value, count: typeof entry.count === "number" ? entry.count : 0 }];
  });
}

export function parseItems(raw: unknown): SearchResultItem[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): SearchResultItem[] => {
    if (!isRecord(entry) || !isSearchResultType(entry.type)) return [];

    // Sem id, título ou destino não há cartão possível: descarta o item.
    const id = typeof entry.id === "string" ? entry.id : null;
    const title = typeof entry.title === "string" ? entry.title : null;
    const url = typeof entry.url === "string" ? entry.url : null;
    if (!id || !title || !url) return [];

    return [
      {
        id,
        type: entry.type,
        title,
        url,
        description: typeof entry.description === "string" ? entry.description : "",
        category: typeof entry.category === "string" ? entry.category : undefined,
        score: typeof entry.score === "number" ? entry.score : undefined,
        hasAccess: typeof entry.hasAccess === "boolean" ? entry.hasAccess : undefined,
        snippet: typeof entry.snippet === "string" ? entry.snippet : null,
        metadata: isRecord(entry.metadata)
          ? (entry.metadata as SearchResultItem["metadata"])
          : undefined,
      },
    ];
  });
}

export function parseSearchResponse(
  raw: unknown,
  fallbackQuery: string,
  pageSize: number,
): SearchResponse {
  if (!isRecord(raw)) return emptySearchResponse(fallbackQuery, pageSize);

  const page = isRecord(raw.page) ? raw.page : {};
  const suggested = typeof raw.suggestedTerm === "string" ? raw.suggestedTerm.trim() : "";

  return {
    query: typeof raw.query === "string" ? raw.query : fallbackQuery,
    items: parseItems(raw.items),
    totalCount: typeof raw.totalCount === "number" ? raw.totalCount : 0,
    countsByType: parseCounts(raw.countsByType),
    categories: parseCategories(raw.categories),
    didYouMean: raw.didYouMean === true,
    suggestedTerm: suggested ? suggested : null,
    page: {
      size: typeof page.size === "number" ? page.size : pageSize,
      offset: typeof page.offset === "number" ? page.offset : 0,
      hasMore: page.hasMore === true,
    },
  };
}

export function parseSuggestions(raw: unknown): SearchSuggestion[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): SearchSuggestion[] => {
    if (!isRecord(entry) || !isSearchResultType(entry.type)) return [];
    const title = typeof entry.title === "string" ? entry.title : null;
    const url = typeof entry.url === "string" ? entry.url : null;
    if (!title || !url) return [];

    return [
      {
        title,
        url,
        type: entry.type,
        category: typeof entry.category === "string" ? entry.category : undefined,
      },
    ];
  });
}
