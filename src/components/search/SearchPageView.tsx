"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Bot,
  FileText,
  Filter,
  Layers,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  X,
  History,
  GraduationCap,
} from "lucide-react";
import { Button, EmptyState } from "@heroui/react";
import { Rise } from "@/components/ui/Rise";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchSkeletons } from "@/components/search/SearchSkeletons";
import { readNotes, type StoredNote } from "@/lib/agentNotes";
import { searchContent } from "@/app/actions/search";
import {
  emptySearchResponse,
  type SearchResponse,
  type SearchSortOption,
  type SearchTabType,
} from "@/types/search";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useRecentSearches } from "@/hooks/useRecentSearches";

const POPULAR_SEARCHES = [
  "Comunicação",
  "Feedback",
  "Liderança",
  "Inteligência Emocional",
  "Negociação",
  "Prática deliberada",
  "Produtividade",
];

const TABS: Array<{ id: SearchTabType; label: string; icon: typeof Layers }> = [
  { id: "all", label: "Todos", icon: Layers },
  { id: "course", label: "Cursos", icon: GraduationCap },
  { id: "lesson", label: "Aulas", icon: BookOpen },
  { id: "agent", label: "Agentes IA", icon: Bot },
  { id: "article", label: "Artigos", icon: FileText },
  { id: "note", label: "Minhas Anotações", icon: StickyNote },
];

export function SearchPageView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Initial State
  const initialQuery = searchParams.get("q") || "";
  const initialTab = (searchParams.get("tab") as SearchTabType) || "all";
  const initialCat = searchParams.get("cat") || "Todas";
  const initialSort = (searchParams.get("sort") as SearchSortOption) || "relevance";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTabType>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [sortBy, setSortBy] = useState<SearchSortOption>(initialSort);

  const [localNotes, setLocalNotes] = useState<StoredNote[]>([]);
  const [results, setResults] = useState<SearchResponse>(() => emptySearchResponse(initialQuery));

  const [isSearching, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const { recentSearches, addRecentSearch, removeSearch } = useRecentSearches();

  // Carrega notas locais do usuário
  useEffect(() => {
    const loaded = readNotes();
    setLocalNotes(loaded);
  }, []);

  // Atalho de teclado: '/' ou 'Cmd+K' foca na busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      const isCmdK = (isMac ? e.metaKey : e.ctrlKey) && e.key === "k";

      if (
        (e.key === "/" || isCmdK) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sincroniza estado para URL
  const updateUrl = useCallback(
    (q: string, tab: SearchTabType, cat: string, sort: SearchSortOption) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (tab !== "all") params.set("tab", tab);
      if (cat !== "Todas") params.set("cat", cat);
      if (sort !== "relevance") params.set("sort", sort);

      const queryString = params.toString();
      const newPath = queryString ? `/busca?${queryString}` : "/busca";
      
      // Update replacing state to avoid massive history stack
      window.history.replaceState(null, "", newPath);
    },
    []
  );

  // Executa busca
  useEffect(() => {
    updateUrl(debouncedQuery, activeTab, selectedCategory, sortBy);

    startTransition(async () => {
      try {
        const res = await searchContent({
          query: debouncedQuery,
          type: activeTab,
          category: selectedCategory,
          sort: sortBy,
          page: 1,
        });
        setResults(res);
      } catch (err) {
        console.error("Search failed:", err);
        setResults(emptySearchResponse(debouncedQuery));
      }
    });
  }, [debouncedQuery, activeTab, selectedCategory, sortBy, localNotes, updateUrl]);

  // Salvar busca recente quando usuário parar de digitar (e houver termo)
  useEffect(() => {
    if (debouncedQuery.trim().length > 2) {
      addRecentSearch(debouncedQuery);
    }
  }, [debouncedQuery, addRecentSearch]);

  const handleClearAll = () => {
    setQuery("");
    setActiveTab("all");
    setSelectedCategory("Todas");
    setSortBy("relevance");
    searchInputRef.current?.focus();
  };

  const hasActiveFilters =
    query.trim().length > 0 ||
    activeTab !== "all" ||
    selectedCategory !== "Todas" ||
    sortBy !== "relevance";

  const renderEmptyState = () => {
    if (!query && recentSearches.length > 0) {
      return (
        <div className="flex w-full flex-col gap-8 md:flex-row">
          <div className="flex-1 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted">
              <History className="size-4" /> Buscas Recentes
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term) => (
                <div
                  key={term}
                  className="group flex items-center gap-1 rounded-full border border-hairline bg-surface/70 pl-3 pr-1 py-1 text-sm font-medium text-foreground transition-colors hover:border-accent/30 hover:bg-surface-hover"
                >
                  <button type="button" onClick={() => setQuery(term)}>
                    {term}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSearch(term)}
                    className="grid size-6 place-items-center rounded-full text-muted opacity-0 hover:bg-surface hover:text-danger group-hover:opacity-100 transition-all"
                    aria-label={`Remover ${term} do histórico`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted">
              <Sparkles className="size-4" /> Sugestões
            </h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-full border border-hairline bg-surface/70 px-3 py-1 text-sm font-medium text-muted transition-colors hover:border-accent/30 hover:bg-surface-hover hover:text-foreground"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-surface/30 px-4 py-16 text-center">
        <EmptyState>
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-surface-hover text-muted">
            <Search className="size-7" aria-hidden="true" />
          </div>
          <p className="eyebrow text-muted">
            {!query ? "Pronto para explorar" : "Nenhum resultado"}
          </p>
          <h2 className="display-3 mt-2 text-foreground">
            {!query
              ? "O que você quer aprender hoje?"
              : "Não encontramos nada com esses termos"}
          </h2>
          <p className="lede mx-auto mt-3 max-w-md text-sm text-muted">
            {!query
              ? "Digite um tema, módulo, nome de agente ou o título de uma anotação que você salvou."
              : activeTab === "note"
              ? "Você ainda não possui anotações contendo esse termo. Anote durante as aulas ou conversas com agentes para vê-las aqui."
              : "Tente usar termos mais genéricos, verificar a ortografia ou limpar os filtros para ver todo o catálogo."}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {hasActiveFilters && (
              <Button variant="primary" size="sm" onPress={handleClearAll} className="gap-2">
                <RotateCcw className="size-4" aria-hidden="true" />
                Limpar todos os filtros
              </Button>
            )}
            {!query && POPULAR_SEARCHES.slice(0, 4).map((term) => (
              <Button
                key={term}
                variant="secondary"
                size="sm"
                onPress={() => setQuery(term)}
              >
                Buscar por {term}
              </Button>
            ))}
          </div>
        </EmptyState>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 pt-[76px]">
      <section className="border-b border-hairline bg-surface/30">
        <div className="editorial-container section-rhythm py-10 sm:py-14">
          <Rise>
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="size-4.5" aria-hidden="true" />
              <p className="eyebrow text-accent">Central de Busca Unificada</p>
            </div>
            <h1 className="display-1 mt-3 max-w-3xl text-foreground">
              Explore todo o conteúdo da plataforma em um só lugar.
            </h1>
          </Rise>

          <Rise delay={80} className="mt-8 max-w-3xl">
            <div className="material-thick relative flex items-center rounded-2xl border border-border/80 p-2 shadow-surface transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
              <div className="pointer-events-none grid size-11 place-items-center text-muted">
                <Search className="size-5" aria-hidden="true" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busque por aulas, agentes, temas, artigos ou anotações..."
                className="w-full bg-transparent px-2 text-base font-semibold text-foreground placeholder:text-muted focus:outline-none sm:text-lg"
                aria-label="Buscar na plataforma"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  aria-label="Limpar termo de busca"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
              <div className="hidden items-center pr-3 sm:flex">
                <kbd className="flex items-center gap-1 rounded-md border border-border/60 bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                  <span>⌘</span><span>K</span>
                </kbd>
              </div>
            </div>
          </Rise>
        </div>
      </section>

      <section className="editorial-container py-8 sm:py-10">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-hairline pb-4 md:flex-row md:items-center">
          <div className="flex w-full items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:w-auto md:flex-wrap md:pb-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = results.countsByType[tab.id];
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors shrink-0",
                    isActive
                      ? "bg-accent-soft text-accent-soft-foreground"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.2 text-xs font-bold",
                      isActive
                        ? "bg-accent/20 text-accent-soft-foreground"
                        : "bg-surface-hover text-muted"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {results.categories.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted" aria-hidden="true" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover focus:border-accent focus:outline-none"
                >
                  <option value="Todas">Todas as categorias</option>
                  {results.categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.value} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5 text-muted" aria-hidden="true" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SearchSortOption)}
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover focus:border-accent focus:outline-none"
              >
                <option value="relevance">Mais relevantes</option>
                <option value="recent">Mais recentes</option>
                <option value="az">Ordem alfabética (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-muted">
            {isSearching ? (
              <span className="flex items-center gap-2">
                <span className="inline-block size-2 animate-ping rounded-full bg-accent" />
                Buscando em aulas, agentes, blog e anotações...
              </span>
            ) : (
              <>
                Mostrando{" "}
                <strong className="font-bold text-foreground">{results.totalCount}</strong>{" "}
                {results.totalCount === 1 ? "resultado encontrado" : "resultados encontrados"}
                {debouncedQuery.trim() && (
                  <span>
                    {" "}
                    para &ldquo;<strong className="text-foreground">{debouncedQuery}</strong>&rdquo;
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        {isSearching ? (
          <SearchSkeletons />
        ) : results.totalCount > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.items.map((item, index) => (
              <SearchResultCard key={item.id} item={item} query={debouncedQuery} index={index} />
            ))}
          </div>
        ) : (
          renderEmptyState()
        )}
      </section>
    </div>
  );
}
