import {
  ALL_CATEGORIES,
  SEARCH_RESULT_TYPES,
  SEARCH_SORT_OPTIONS,
  type SearchQueryState,
  type SearchSortOption,
  type SearchTabType,
} from "@/types/search";

/**
 * A URL é a única fonte da verdade da tela de busca.
 *
 * Isso não é preciosismo de arquitetura: é o que faz o resultado ser
 * compartilhável, sobreviver a um F5 e voltar igual pelo botão "voltar" do
 * navegador. O estado do React é derivado daqui, nunca o contrário — por isso
 * as duas funções abaixo são puras e simétricas.
 *
 * O valor padrão de cada campo é omitido da querystring: `/busca?q=lideranca`
 * é mais legível — e mais estável para cache — que
 * `/busca?q=lideranca&tab=all&cat=Todas&sort=relevance&page=1`.
 */

export const DEFAULT_SEARCH_STATE: SearchQueryState = {
  query: "",
  type: "all",
  category: ALL_CATEGORIES,
  sort: "relevance",
  page: 1,
};

export const SEARCH_PAGE_SIZE = 24;

/** Teto de páginas, espelhando o limite de offset da RPC. */
const MAX_PAGE = 200;

type ParamsLike = Pick<URLSearchParams, "get">;

function parseType(raw: string | null): SearchTabType {
  if (!raw) return "all";
  const value = raw.toLowerCase();
  if (value === "all") return "all";
  return (SEARCH_RESULT_TYPES as readonly string[]).includes(value) ? (value as SearchTabType) : "all";
}

function parseSort(raw: string | null): SearchSortOption {
  if (!raw) return "relevance";
  const value = raw.toLowerCase();
  return (SEARCH_SORT_OPTIONS as readonly string[]).includes(value)
    ? (value as SearchSortOption)
    : "relevance";
}

function parsePage(raw: string | null): number {
  if (!raw) return 1;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, MAX_PAGE);
}

export function parseSearchState(params: ParamsLike): SearchQueryState {
  const category = params.get("cat")?.trim();

  return {
    query: params.get("q")?.trim() ?? "",
    type: parseType(params.get("tab")),
    category: category ? category : ALL_CATEGORIES,
    sort: parseSort(params.get("sort")),
    page: parsePage(params.get("page")),
  };
}

export function serializeSearchState(state: SearchQueryState): string {
  const params = new URLSearchParams();

  const query = state.query.trim();
  if (query) params.set("q", query);
  if (state.type !== DEFAULT_SEARCH_STATE.type) params.set("tab", state.type);
  if (state.category && state.category !== ALL_CATEGORIES) params.set("cat", state.category);
  if (state.sort !== DEFAULT_SEARCH_STATE.sort) params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));

  return params.toString();
}

export function searchStateToHref(state: SearchQueryState, pathname = "/busca"): string {
  const qs = serializeSearchState(state);
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Dois estados que produzem a mesma URL produzem a mesma busca. */
export function isSameSearchState(a: SearchQueryState, b: SearchQueryState): boolean {
  return serializeSearchState(a) === serializeSearchState(b);
}

/**
 * Trocar termo, aba, categoria ou ordenação sempre volta para a primeira
 * página: manter `page=4` depois de trocar de aba é a forma mais rápida de
 * mostrar "nenhum resultado" para uma busca que tem resultados.
 */
export function withSearchPatch(
  state: SearchQueryState,
  patch: Partial<SearchQueryState>,
): SearchQueryState {
  const next = { ...state, ...patch };
  const resetsPage =
    patch.page === undefined &&
    (patch.query !== undefined ||
      patch.type !== undefined ||
      patch.category !== undefined ||
      patch.sort !== undefined);

  if (resetsPage) next.page = 1;
  return next;
}

export function hasActiveFilters(state: SearchQueryState): boolean {
  return (
    state.query.trim().length > 0 ||
    state.type !== DEFAULT_SEARCH_STATE.type ||
    state.category !== ALL_CATEGORIES ||
    state.sort !== DEFAULT_SEARCH_STATE.sort
  );
}

/**
 * Evento que abre a paleta de busca (⌘K) de qualquer lugar da interface.
 *
 * Um `CustomEvent` no `window` em vez de contexto do React porque quem dispara
 * (o botão da barra de navegação) e quem escuta (a paleta) vivem em ramos
 * distintos da árvore e não compartilham nada além do shell — um provider só
 * para isso seria mais peça do que problema.
 */
export const OPEN_SEARCH_EVENT = "smartlms:open-search";

export function requestSearchPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
}
