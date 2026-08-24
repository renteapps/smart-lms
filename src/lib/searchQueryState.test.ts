import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_STATE,
  hasActiveFilters,
  isSameSearchState,
  parseSearchState,
  searchStateToHref,
  serializeSearchState,
  withSearchPatch,
} from "@/lib/searchQueryState";
import { ALL_CATEGORIES, type SearchQueryState } from "@/types/search";

const parse = (qs: string) => parseSearchState(new URLSearchParams(qs));

describe("parseSearchState", () => {
  it("cai no padrão quando a querystring está vazia", () => {
    expect(parse("")).toEqual(DEFAULT_SEARCH_STATE);
  });

  it("lê todos os campos", () => {
    expect(parse("q=lideranca&tab=course&cat=Gest%C3%A3o&sort=recent&page=3")).toEqual({
      query: "lideranca",
      type: "course",
      category: "Gestão",
      sort: "recent",
      page: 3,
    });
  });

  it("ignora tipo e ordenação inventados em vez de confiar na URL", () => {
    const state = parse("tab=dropTable&sort=aleatorio");
    expect(state.type).toBe("all");
    expect(state.sort).toBe("relevance");
  });

  it("normaliza página inválida para 1", () => {
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=-4").page).toBe(1);
    expect(parse("page=abc").page).toBe(1);
  });

  it("limita a página a um teto, espelhando o limite de offset da RPC", () => {
    expect(parse("page=99999").page).toBe(200);
  });
});

describe("serializeSearchState", () => {
  it("omite todo valor padrão", () => {
    expect(serializeSearchState(DEFAULT_SEARCH_STATE)).toBe("");
    expect(searchStateToHref(DEFAULT_SEARCH_STATE)).toBe("/busca");
  });

  it("escreve só o que difere do padrão", () => {
    const state: SearchQueryState = {
      query: "  feedback  ",
      type: "lesson",
      category: ALL_CATEGORIES,
      sort: "relevance",
      page: 1,
    };
    expect(serializeSearchState(state)).toBe("q=feedback&tab=lesson");
  });

  it("faz a volta completa sem perder informação", () => {
    const state: SearchQueryState = {
      query: "comunicação não-violenta",
      type: "article",
      category: "Gestão & Pessoas",
      sort: "az",
      page: 7,
    };
    expect(parse(serializeSearchState(state))).toEqual(state);
  });

  it("considera iguais dois estados que geram a mesma URL", () => {
    expect(isSameSearchState(DEFAULT_SEARCH_STATE, { ...DEFAULT_SEARCH_STATE })).toBe(true);
    expect(isSameSearchState(DEFAULT_SEARCH_STATE, { ...DEFAULT_SEARCH_STATE, page: 2 })).toBe(false);
  });
});

describe("withSearchPatch", () => {
  const onPage4: SearchQueryState = { ...DEFAULT_SEARCH_STATE, query: "lideranca", page: 4 };

  it("volta para a primeira página ao mudar o que filtra", () => {
    expect(withSearchPatch(onPage4, { type: "lesson" }).page).toBe(1);
    expect(withSearchPatch(onPage4, { query: "outro" }).page).toBe(1);
    expect(withSearchPatch(onPage4, { category: "Gestão" }).page).toBe(1);
    expect(withSearchPatch(onPage4, { sort: "az" }).page).toBe(1);
  });

  it("respeita a página quando ela é o que mudou", () => {
    expect(withSearchPatch(onPage4, { page: 6 }).page).toBe(6);
  });

  it("não mexe na página quando nada de filtro mudou", () => {
    expect(withSearchPatch(onPage4, {}).page).toBe(4);
  });
});

describe("hasActiveFilters", () => {
  it("é falso no estado padrão", () => {
    expect(hasActiveFilters(DEFAULT_SEARCH_STATE)).toBe(false);
  });

  it("não conta paginação como filtro", () => {
    expect(hasActiveFilters({ ...DEFAULT_SEARCH_STATE, page: 3 })).toBe(false);
  });

  it("é verdadeiro para termo, aba, categoria ou ordenação", () => {
    expect(hasActiveFilters({ ...DEFAULT_SEARCH_STATE, query: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_SEARCH_STATE, type: "note" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_SEARCH_STATE, category: "Gestão" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_SEARCH_STATE, sort: "az" })).toBe(true);
  });
});
