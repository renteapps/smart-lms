"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { getSearchSuggestions, searchContent } from "@/app/actions/search";
import { readNotes, type StoredNote } from "@/lib/agentNotes";
import { searchLocalNotes } from "@/lib/searchLocalNotes";
import {
  SEARCH_PAGE_SIZE,
  parseSearchState,
  searchStateToHref,
  withSearchPatch,
} from "@/lib/searchQueryState";
import { useDebounce } from "@/hooks/useDebounce";
import {
  emptySearchResponse,
  type SearchQueryState,
  type SearchResponse,
  type SearchResultItem,
  type SearchSuggestion,
} from "@/types/search";

/**
 * O cérebro da tela de busca.
 *
 * Concentra aqui quatro coisas que, espalhadas pelo componente de tela, viram
 * bug silencioso:
 *
 *  1. **A URL é a fonte da verdade.** Todo estado nasce de `?q&tab&cat&sort&page`
 *     e volta para lá — o resultado é compartilhável e o botão "voltar" do
 *     navegador funciona de verdade (ver o efeito de adoção de URL externa).
 *  2. **Respostas fora de ordem são descartadas.** Digitando rápido, várias
 *     buscas ficam em voo ao mesmo tempo e não há garantia de que voltem na
 *     ordem em que saíram; sem o contador de sequência, o resultado de "lid"
 *     pode sobrescrever o de "lideranca".
 *  3. **O resultado anterior fica na tela enquanto o novo carrega.** Trocar
 *     tudo por esqueleto a cada tecla faz a página piscar e o texto pular.
 *  4. **Anotação local nunca sai do navegador.** Ela é casada aqui mesmo e
 *     costurada ao resultado do servidor.
 */

const QUERY_DEBOUNCE_MS = 300;
const SUGGEST_DEBOUNCE_MS = 160;
const MIN_SUGGEST_LENGTH = 2;

export interface SearchController {
  /** Valor do campo — atualiza a cada tecla. */
  draft: string;
  setDraft: (value: string) => void;
  /** Estado efetivamente buscado (termo já estabilizado). */
  state: SearchQueryState;
  patch: (patch: Partial<SearchQueryState>) => void;
  reset: () => void;
  submit: (value?: string) => void;

  response: SearchResponse;
  items: SearchResultItem[];
  totalCount: number;
  noteCount: number;

  /** Primeira busca ainda não voltou: é a hora do esqueleto. */
  isInitialLoading: boolean;
  /** Há busca em voo, mas já existe resultado anterior na tela. */
  isRefreshing: boolean;
  hasQuery: boolean;

  suggestions: SearchSuggestion[];
  isSuggestOpen: boolean;
  openSuggestions: () => void;
  closeSuggestions: () => void;
}

export function useSearchController(): SearchController {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<SearchQueryState>(() => parseSearchState(searchParams));
  const [draft, setDraft] = useState(() => parseSearchState(searchParams).query);
  const [response, setResponse] = useState<SearchResponse>(() =>
    emptySearchResponse(state.query, SEARCH_PAGE_SIZE),
  );
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [inFlight, setInFlight] = useState(true);

  const [localNotes, setLocalNotes] = useState<StoredNote[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggestOpen, setSuggestOpen] = useState(false);

  const debouncedDraft = useDebounce(draft, QUERY_DEBOUNCE_MS);
  const debouncedSuggest = useDebounce(draft, SUGGEST_DEBOUNCE_MS);

  const requestSeq = useRef(0);
  const suggestSeq = useRef(0);
  const lastWrittenHref = useRef<string | null>(null);

  // Notas que só existem no navegador (ver searchLocalNotes).
  useEffect(() => {
    setLocalNotes(readNotes());
  }, []);

  // Termo estabilizado entra no estado — e volta para a primeira página.
  useEffect(() => {
    const query = debouncedDraft.trim();
    setState((prev) => (prev.query === query ? prev : withSearchPatch(prev, { query })));
  }, [debouncedDraft]);

  /*
   * Adota mudanças de URL que não vieram daqui — ou seja, "voltar"/"avançar"
   * do navegador. Comparar o href já escrito evita que a própria sincronização
   * de saída volte como entrada e apague o que a pessoa está digitando.
   */
  useEffect(() => {
    const fromUrl = parseSearchState(searchParams);
    const href = searchStateToHref(fromUrl);
    if (lastWrittenHref.current === href) return;

    lastWrittenHref.current = href;
    setState(fromUrl);
    setDraft(fromUrl.query);
  }, [searchParams]);

  // Estado -> URL.
  useEffect(() => {
    const href = searchStateToHref(state);
    if (lastWrittenHref.current === href) return;

    lastWrittenHref.current = href;
    router.replace(href, { scroll: false });
  }, [state, router]);

  // Estado -> busca, descartando respostas atrasadas.
  useEffect(() => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setInFlight(true);

    let active = true;

    searchContent({ ...state, pageSize: SEARCH_PAGE_SIZE })
      .then((result) => {
        if (!active || requestSeq.current !== seq) return;
        setResponse(result);
        setHasLoadedOnce(true);
      })
      .catch((error) => {
        if (!active || requestSeq.current !== seq) return;
        console.error("[busca] falha ao buscar:", error);
        setResponse(emptySearchResponse(state.query, SEARCH_PAGE_SIZE));
        setHasLoadedOnce(true);
      })
      .finally(() => {
        if (!active || requestSeq.current !== seq) return;
        setInFlight(false);
      });

    return () => {
      active = false;
    };
  }, [state]);

  // Sugestões do campo, com a mesma proteção contra resposta atrasada.
  useEffect(() => {
    const term = debouncedSuggest.trim();

    if (!isSuggestOpen || term.length < MIN_SUGGEST_LENGTH) {
      setSuggestions([]);
      return;
    }

    const seq = suggestSeq.current + 1;
    suggestSeq.current = seq;
    let active = true;

    getSearchSuggestions(term)
      .then((result) => {
        if (!active || suggestSeq.current !== seq) return;
        setSuggestions(result);
      })
      .catch(() => {
        if (!active || suggestSeq.current !== seq) return;
        setSuggestions([]);
      });

    return () => {
      active = false;
    };
  }, [debouncedSuggest, isSuggestOpen]);

  /*
   * Notas locais entram só na primeira página e só nas abas onde fariam
   * sentido. Elas não participam da ordenação por relevância do banco — vêm
   * depois, para não empurrar um resultado melhor para baixo.
   */
  const localMatches = useMemo(() => {
    if (localNotes.length === 0) return [];
    if (state.page !== 1) return [];
    if (state.type !== "all" && state.type !== "note") return [];
    if (state.category !== "Todas" && state.category !== "Minhas Anotações") return [];

    const knownIds = new Set(response.items.map((item) => item.id));
    return searchLocalNotes(localNotes, state.query, knownIds);
  }, [localNotes, response.items, state.category, state.page, state.query, state.type]);

  const items = useMemo(() => {
    if (localMatches.length === 0) return response.items;
    return state.type === "note"
      ? [...localMatches, ...response.items]
      : [...response.items, ...localMatches];
  }, [localMatches, response.items, state.type]);

  const patch = useCallback((next: Partial<SearchQueryState>) => {
    if (next.query !== undefined) setDraft(next.query);
    setState((prev) => withSearchPatch(prev, next));
  }, []);

  const reset = useCallback(() => {
    setDraft("");
    setState((prev) => withSearchPatch(prev, { query: "", type: "all", category: "Todas", sort: "relevance" }));
    setSuggestOpen(false);
  }, []);

  /** Enter no campo: aplica o termo na hora, sem esperar o debounce. */
  const submit = useCallback(
    (value?: string) => {
      const query = (value ?? draft).trim();
      setDraft(query);
      setState((prev) => withSearchPatch(prev, { query }));
      setSuggestOpen(false);
    },
    [draft],
  );

  const openSuggestions = useCallback(() => setSuggestOpen(true), []);
  const closeSuggestions = useCallback(() => setSuggestOpen(false), []);

  return {
    draft,
    setDraft,
    state,
    patch,
    reset,
    submit,
    response,
    items,
    totalCount: response.totalCount + localMatches.length,
    noteCount: response.countsByType.note + localMatches.length,
    isInitialLoading: !hasLoadedOnce && inFlight,
    isRefreshing: hasLoadedOnce && inFlight,
    hasQuery: state.query.trim().length > 0,
    suggestions,
    isSuggestOpen,
    openSuggestions,
    closeSuggestions,
  };
}
