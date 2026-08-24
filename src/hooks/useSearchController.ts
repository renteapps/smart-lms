"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSearchSuggestions, searchContent } from "@/app/actions/search";
import { logSearchClick, logSearchEvent } from "@/app/actions/searchTelemetry";
import { searchLocalNotes } from "@/lib/searchLocalNotes";
import { useLocalNotes } from "@/hooks/useLocalNotes";
import {
  SEARCH_PAGE_SIZE,
  isSameSearchState,
  parseSearchState,
  searchStateToHref,
  serializeSearchState,
  withSearchPatch,
} from "@/lib/searchQueryState";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ALL_CATEGORIES,
  emptySearchResponse,
  type SearchQueryState,
  type SearchResponse,
  type SearchResultItem,
  type SearchResultType,
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
 *     navegador funciona de verdade.
 *  2. **Respostas fora de ordem são descartadas.** Digitando rápido, várias
 *     buscas ficam em voo ao mesmo tempo e não há garantia de que voltem na
 *     ordem em que saíram; sem o carimbo de sequência, o resultado de "lid"
 *     pode sobrescrever o de "lideranca".
 *  3. **O resultado anterior fica na tela enquanto o novo carrega.** Trocar
 *     tudo por esqueleto a cada tecla faz a página piscar e o texto pular.
 *  4. **Anotação local nunca sai do navegador.** Ela é casada aqui mesmo e
 *     costurada ao resultado do servidor.
 *
 * Nota sobre a forma do código: quase nada aqui é `setState` dentro de efeito.
 * "Está carregando?" é `chave do estado atual ≠ chave do resultado guardado`,
 * e não uma flag que alguém precisa lembrar de baixar; a sugestão destacada é
 * guardada pela URL dela, não pelo índice, então uma lista nova a invalida
 * sozinha. Estado derivado não dessincroniza.
 */

const QUERY_DEBOUNCE_MS = 300;
/*
 * Bem mais longo que o da busca: a busca precisa responder a cada tecla, o
 * registro precisa do contrário — esperar a pessoa parar. O banco ainda
 * colapsa prefixos (ver `log_search_event`), então este atraso é a primeira
 * de duas defesas contra uma linha por tecla digitada.
 */
const TELEMETRY_SETTLE_MS = 1200;
/*
 * Guarda os últimos resultados **desta sessão, deste usuário, nesta aba**.
 *
 * Cache no servidor está fora de questão aqui: o resultado depende de
 * matrícula e inclui as anotações pessoais de quem busca — o mesmo termo
 * devolve coisas diferentes para pessoas diferentes, e uma chave por termo
 * vazaria conteúdo entre contas. No cliente o problema não existe: só há um
 * usuário, e o cache morre junto com a aba.
 *
 * O ganho é o vaivém entre abas e páginas, que é o padrão de uso real de uma
 * busca: voltar para "Tudo" depois de olhar "Aulas" passa a ser instantâneo.
 */
const RESULT_CACHE_LIMIT = 30;
const SUGGEST_DEBOUNCE_MS = 160;
const MIN_SUGGEST_LENGTH = 2;

interface LoadState {
  /** Respostas já obtidas nesta sessão, indexadas pela chave do estado. */
  cache: Map<string, SearchResponse>;
  /** Chave da última resposta que chegou — é o que define "ainda carregando". */
  settledKey: string | null;
}

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

  /** Avisa a telemetria de qual resultado foi aberto. */
  reportClick: (documentId: string, documentType: SearchResultType, position: number) => void;

  suggestions: SearchSuggestion[];
  activeSuggestion: number;
  setActiveSuggestion: (index: number) => void;
  isSuggestOpen: boolean;
  openSuggestions: () => void;
  closeSuggestions: () => void;
}

export function useSearchController(): SearchController {
  const router = useRouter();
  const searchParams = useSearchParams();
  // A rota vem do próprio Next, não fixa em "/busca": o hook não precisa
  // saber onde foi montado, e escrever um caminho fixo levaria a navegação
  // para fora de qualquer outra tela que o reaproveite.
  const pathname = usePathname();

  const [state, setState] = useState<SearchQueryState>(() => parseSearchState(searchParams));
  const [draft, setDraftValue] = useState<string>(() => parseSearchState(searchParams).query);
  const [load, setLoad] = useState<LoadState>(() => ({ cache: new Map(), settledKey: null }));
  const [rawSuggestions, setRawSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeSuggestionKey, setActiveSuggestionKey] = useState<string | null>(null);
  const [isSuggestOpen, setSuggestOpen] = useState(false);

  // Notas que só existem no navegador (ver searchLocalNotes).
  const localNotes = useLocalNotes();

  const debouncedSuggest = useDebounce(draft, SUGGEST_DEBOUNCE_MS);

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);
  const suggestSeq = useRef(0);
  const lastWrittenHref = useRef<string | null>(null);
  // Id do evento de busca em aberto — ref, e não estado, porque nada na tela
  // depende dele; só o clique, quando e se acontecer.
  const eventIdRef = useRef<string | null>(null);

  const stateKey = useMemo(() => serializeSearchState(state), [state]);

  /*
   * "Carregando" é derivado: a resposta guardada carrega a chave do estado que
   * a produziu, então basta comparar. Uma flag separada precisaria ser baixada
   * em todos os caminhos de saída da requisição — inclusive nos de erro.
   */
  /*
   * O cache mora em estado, não em ref: ler ref durante o render é proibido em
   * renderização concorrente — o React pode descartar e refazer um render, e
   * um valor lido de ref não participa disso.
   */
  const current = load.cache.get(stateKey);
  const previous = load.settledKey ? load.cache.get(load.settledKey) : undefined;

  // Enquanto o novo resultado não chega, a tela segue mostrando o anterior.
  const response = current ?? previous ?? emptySearchResponse(state.query, SEARCH_PAGE_SIZE);
  const inFlight = load.settledKey !== stateKey;

  const commitQuery = useCallback((value: string) => {
    const query = value.trim();
    setState((prev) => (prev.query === query ? prev : withSearchPatch(prev, { query })));
  }, []);

  /** Digitar agenda a busca; o estado só muda quando a pessoa faz uma pausa. */
  const setDraft = useCallback(
    (value: string) => {
      setDraftValue(value);
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => commitQuery(value), QUERY_DEBOUNCE_MS);
    },
    [commitQuery],
  );

  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  /*
   * Adota mudanças de URL que não vieram daqui — ou seja, "voltar"/"avançar"
   * do navegador. Comparar com o href já escrito evita que a própria
   * sincronização de saída volte como entrada e apague o que está sendo
   * digitado.
   */
  useEffect(() => {
    const fromUrl = parseSearchState(searchParams);
    const href = searchStateToHref(fromUrl, pathname);
    if (lastWrittenHref.current === href) return;

    lastWrittenHref.current = href;
    // Só troca a referência quando o valor mudou de fato: `setState` com o
    // mesmo objeto faz o React desistir da renderização, e é isso que evita
    // uma segunda busca logo na montagem (a URL inicial e o estado inicial
    // descrevem a mesma coisa, mas seriam objetos diferentes).
    setState((prev) => (isSameSearchState(prev, fromUrl) ? prev : fromUrl));
    setDraftValue((prev) => (prev === fromUrl.query ? prev : fromUrl.query));
  }, [searchParams, pathname]);

  // Estado -> URL.
  useEffect(() => {
    const href = searchStateToHref(state, pathname);
    if (lastWrittenHref.current === href) return;

    lastWrittenHref.current = href;
    router.replace(href, { scroll: false });
  }, [state, router, pathname]);

  // Estado -> busca, descartando respostas atrasadas.
  useEffect(() => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    let active = true;

    searchContent({ ...state, pageSize: SEARCH_PAGE_SIZE })
      .then((result) => {
        if (!active || requestSeq.current !== seq) return;

        setLoad((prev) => {
          // Descarte do mais antigo: o Map preserva ordem de inserção, e para
          // 30 entradas a diferença entre isto e um LRU de verdade é teórica.
          const cache = new Map(prev.cache);
          cache.delete(stateKey);
          cache.set(stateKey, result);
          if (cache.size > RESULT_CACHE_LIMIT) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
          }
          return { cache, settledKey: stateKey };
        });
      })
      .catch((error) => {
        if (!active || requestSeq.current !== seq) return;
        console.error("[busca] falha ao buscar:", error);
        setLoad((prev) => {
          const cache = new Map(prev.cache);
          cache.set(stateKey, emptySearchResponse(state.query, SEARCH_PAGE_SIZE));
          return { cache, settledKey: stateKey };
        });
      });

    return () => {
      active = false;
    };
  }, [state, stateKey]);

  /*
   * Registra a busca depois que ela assenta. Fica de fora quando não há termo
   * (navegar o catálogo não é uma pergunta) e o resultado é ignorado — se a
   * telemetria falhar, a busca segue exatamente igual.
   */
  useEffect(() => {
    const query = state.query.trim();
    if (!query || inFlight) return;

    eventIdRef.current = null;
    const timer = setTimeout(() => {
      void logSearchEvent({
        query,
        resultCount: response.totalCount,
        type: state.type,
        category: state.category,
        didYouMean: response.didYouMean,
      }).then((eventId) => {
        eventIdRef.current = eventId;
      });
    }, TELEMETRY_SETTLE_MS);

    return () => clearTimeout(timer);
  }, [state.query, state.type, state.category, inFlight, response.totalCount, response.didYouMean]);

  const reportClick = useCallback(
    (documentId: string, documentType: SearchResultType, position: number) => {
      const eventId = eventIdRef.current;
      if (!eventId) return;
      // Sem `await`: a navegação do resultado não espera pela estatística.
      void logSearchClick({ eventId, documentId, documentType, position });
    },
    [],
  );

  const shouldSuggest = isSuggestOpen && debouncedSuggest.trim().length >= MIN_SUGGEST_LENGTH;

  // Sugestões do campo, com a mesma proteção contra resposta atrasada.
  useEffect(() => {
    if (!shouldSuggest) return;

    const term = debouncedSuggest.trim();
    const seq = suggestSeq.current + 1;
    suggestSeq.current = seq;
    let active = true;

    getSearchSuggestions(term)
      .then((result) => {
        if (!active || suggestSeq.current !== seq) return;
        setRawSuggestions(result);
      })
      .catch(() => {
        if (!active || suggestSeq.current !== seq) return;
        setRawSuggestions([]);
      });

    return () => {
      active = false;
    };
  }, [debouncedSuggest, shouldSuggest]);

  const suggestions = useMemo(
    () => (shouldSuggest ? rawSuggestions : []),
    [shouldSuggest, rawSuggestions],
  );

  /*
   * O destaque guarda a URL da sugestão, não a posição. Lista nova em que
   * aquela sugestão não existe mais devolve -1 sozinha, sem precisar de um
   * efeito para zerar o índice a cada resposta.
   */
  const activeSuggestion = activeSuggestionKey
    ? suggestions.findIndex((suggestion) => suggestion.url === activeSuggestionKey)
    : -1;

  const setActiveSuggestion = useCallback(
    (index: number) => {
      setActiveSuggestionKey(index >= 0 ? (suggestions[index]?.url ?? null) : null);
    },
    [suggestions],
  );

  /*
   * Notas locais entram só na primeira página e só nas abas onde fariam
   * sentido. Elas não participam da ordenação por relevância do banco — vêm
   * depois, para não empurrar um resultado melhor para baixo.
   */
  const localMatches = useMemo(() => {
    if (localNotes.length === 0) return [];
    if (state.page !== 1) return [];
    if (state.type !== "all" && state.type !== "note") return [];
    if (state.category !== ALL_CATEGORIES && state.category !== "Minhas Anotações") return [];

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
    if (next.query !== undefined) {
      if (commitTimer.current) clearTimeout(commitTimer.current);
      setDraftValue(next.query);
    }
    setState((prev) => withSearchPatch(prev, next));
  }, []);

  const reset = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    setDraftValue("");
    setState((prev) =>
      withSearchPatch(prev, { query: "", type: "all", category: ALL_CATEGORIES, sort: "relevance" }),
    );
    setSuggestOpen(false);
  }, []);

  /** Enter no campo aplica o termo na hora, sem esperar o debounce. */
  const submit = useCallback(
    (value?: string) => {
      const query = (value ?? draft).trim();
      if (commitTimer.current) clearTimeout(commitTimer.current);
      setDraftValue(query);
      commitQuery(query);
      setSuggestOpen(false);
    },
    [commitQuery, draft],
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
    isInitialLoading: !current && !previous,
    isRefreshing: Boolean(current ?? previous) && inFlight,
    hasQuery: state.query.trim().length > 0,
    reportClick,
    suggestions,
    activeSuggestion,
    setActiveSuggestion,
    isSuggestOpen,
    openSuggestions,
    closeSuggestions,
  };
}
