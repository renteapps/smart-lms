export type SearchResultType = "course" | "lesson" | "agent" | "article" | "note";

export type SearchTabType = "all" | SearchResultType;

export const SEARCH_RESULT_TYPES: readonly SearchResultType[] = [
  "course",
  "lesson",
  "agent",
  "article",
  "note",
] as const;

export type SearchSortOption = "relevance" | "recent" | "az";

export const SEARCH_SORT_OPTIONS: readonly SearchSortOption[] = ["relevance", "recent", "az"] as const;

/** Rótulo neutro de "sem filtro de categoria". Vale para a URL e para o select. */
export const ALL_CATEGORIES = "Todas";

export interface SearchResultMetadata {
  // Curso e aula
  courseId?: string;
  courseSlug?: string;
  courseTitle?: string;
  moduleTitle?: string;
  duration?: string | number;
  lessonType?: "video" | "text" | "quiz" | "profile_test" | "personalized_ai";
  level?: string;
  cover?: string;
  tags?: string[];
  isFeatured?: boolean;
  hasAccess?: boolean;
  /** Aula que este aluno já concluiu. */
  isCompleted?: boolean;

  // Agentes
  avatar?: string;
  role?: string;
  skills?: string[];
  agentStatus?: string;
  rating?: number;
  themeColor?: string;

  // Revista / blog
  author?: string;
  readingTime?: number;
  hasAudio?: boolean;

  // Anotações
  pinned?: boolean;
  updatedAt?: string;
  noteKind?: "lesson" | "agent" | "personal";
  lessonId?: string;
}

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  category?: string;
  url: string;
  /** Pontuação combinada devolvida pelo banco (0..1+), só para depuração/ordem. */
  score?: number;
  hasAccess?: boolean;
  /**
   * Trecho do corpo do documento com os termos marcados por `<b>`, vindo do
   * `ts_headline`. As tags do conteúdo original são removidas no banco antes
   * da marcação, então este texto é fatiado — nunca injetado como HTML.
   */
  snippet?: string | null;
  metadata?: SearchResultMetadata;
  /** Resultado que só existe no navegador (anotação em localStorage). */
  isLocal?: boolean;
}

export interface SearchCategoryFacet {
  value: string;
  count: number;
}

export interface SearchCountsByType {
  all: number;
  course: number;
  lesson: number;
  agent: number;
  article: number;
  note: number;
}

export interface SearchPageInfo {
  size: number;
  offset: number;
  hasMore: boolean;
}

export interface SearchResponse {
  query: string;
  items: SearchResultItem[];
  totalCount: number;
  countsByType: SearchCountsByType;
  categories: SearchCategoryFacet[];
  /** O termo exato não achou nada e estes resultados vêm da busca aproximada. */
  didYouMean: boolean;
  /** Palavra que a pessoa provavelmente quis digitar, com acento. */
  suggestedTerm: string | null;
  page: SearchPageInfo;
}

export interface SearchSuggestion {
  title: string;
  type: SearchResultType;
  url: string;
  category?: string;
}

/** Estado completo de uma busca — o mesmo objeto que a URL representa. */
export interface SearchQueryState {
  query: string;
  type: SearchTabType;
  category: string;
  sort: SearchSortOption;
  page: number;
}

export interface SearchRequest extends SearchQueryState {
  pageSize?: number;
}

export const EMPTY_COUNTS: SearchCountsByType = {
  all: 0,
  course: 0,
  lesson: 0,
  agent: 0,
  article: 0,
  note: 0,
};

export function emptySearchResponse(query = "", pageSize = 24): SearchResponse {
  return {
    query,
    items: [],
    totalCount: 0,
    countsByType: { ...EMPTY_COUNTS },
    categories: [],
    didYouMean: false,
    suggestedTerm: null,
    page: { size: pageSize, offset: 0, hasMore: false },
  };
}
