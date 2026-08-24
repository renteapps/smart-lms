"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { Button } from "@heroui/react";
import { Compass, History, Lightbulb, Search, Sparkles, X } from "lucide-react";
import { Rise } from "@/components/ui/Rise";
import { SearchFilters, searchPanelId, searchTabId } from "@/components/search/SearchFilters";
import { SearchOmnibox } from "@/components/search/SearchOmnibox";
import { SearchPagination } from "@/components/search/SearchPagination";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SearchSkeletons } from "@/components/search/SearchSkeletons";
import { SEARCH_TABS } from "@/components/search/searchResultMeta";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useSearchController } from "@/hooks/useSearchController";
import { SEARCH_PAGE_SIZE, hasActiveFilters } from "@/lib/searchQueryState";
import { cn } from "@/lib/utils";
import { ALL_CATEGORIES } from "@/types/search";

export function SearchPageView() {
  const controller = useSearchController();
  const {
    draft,
    setDraft,
    state,
    patch,
    reset,
    submit,
    response,
    items,
    totalCount,
    noteCount,
    isInitialLoading,
    isRefreshing,
    hasQuery,
    reportClick,
    suggestions,
    activeSuggestion,
    setActiveSuggestion,
    isSuggestOpen,
    openSuggestions,
    closeSuggestions,
  } = controller;

  const { recentSearches, addRecentSearch, removeSearch, clearRecentSearches } = useRecentSearches();
  const resultsRef = useRef<HTMLDivElement>(null);
  // Prefixo único ligando cada aba ao painel de resultados (padrão WAI-ARIA).
  const idPrefix = useId();

  const filtersActive = hasActiveFilters(state);

  /*
   * O histórico guarda buscas que a pessoa levou até o fim — não cada estado
   * intermediário da digitação. Por isso a gravação depende de haver
   * resultado: "lider" que virou "lideranca" não merece duas entradas.
   */
  const lastRecorded = useRef<string | null>(null);

  useEffect(() => {
    if (!hasQuery || isInitialLoading || isRefreshing) return;
    if (totalCount === 0) return;
    if (lastRecorded.current === state.query) return;

    lastRecorded.current = state.query;
    addRecentSearch(state.query);
  }, [addRecentSearch, hasQuery, isInitialLoading, isRefreshing, state.query, totalCount]);

  // Notas locais não passaram pelo banco, então entram na contagem aqui.
  const counts = useMemo(() => {
    const localExtra = noteCount - response.countsByType.note;
    return {
      ...response.countsByType,
      note: noteCount,
      all: response.countsByType.all + localExtra,
    };
  }, [response.countsByType, noteCount]);

  const goToPage = (page: number) => {
    patch({ page });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const topCategories = response.categories.slice(0, 8);
  const hasResults = items.length > 0;
  const showSkeleton = isInitialLoading;

  return (
    <div className="min-h-screen pb-24 pt-[76px]">
      <section className="border-b border-hairline bg-background-secondary/40">
        <div className="editorial-container py-10 sm:py-14">
          <Rise>
            <p className="eyebrow flex items-center gap-2 text-accent">
              <Sparkles className="size-4" aria-hidden="true" />
              Busca unificada
            </p>
            <h1 className="display-1 mt-3 max-w-3xl text-foreground">
              Tudo o que a plataforma tem, em um campo só.
            </h1>
            <p className="lede mt-3 text-muted">
              Cursos, aulas, agentes de IA, artigos da revista e as suas anotações — a busca entende
              acento, erro de digitação e palavra pela metade.
            </p>
          </Rise>

          <Rise delay={80} className="mt-8 max-w-3xl">
            <SearchOmnibox
              value={draft}
              onValueChange={setDraft}
              onSubmit={submit}
              suggestions={suggestions}
              isOpen={isSuggestOpen}
              onOpen={openSuggestions}
              onClose={closeSuggestions}
              activeIndex={activeSuggestion}
              onActiveIndexChange={setActiveSuggestion}
              isBusy={isRefreshing}
            />

            {!hasQuery ? (
              <div className="mt-5 flex flex-col gap-4">
                {recentSearches.length > 0 ? (
                  <TermRow
                    icon={<History className="size-3.5" aria-hidden="true" />}
                    title="Buscas recentes"
                    action={
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-xs font-semibold text-muted underline-grow hover:text-foreground"
                      >
                        Limpar histórico
                      </button>
                    }
                  >
                    {recentSearches.map((term) => (
                      <span
                        key={term}
                        className="group flex items-center gap-0.5 rounded-full border border-hairline bg-surface py-1 pl-3 pr-1 text-sm font-medium text-foreground transition-colors hover:border-hairline-strong"
                      >
                        <button type="button" onClick={() => submit(term)} className="press">
                          {term}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSearch(term)}
                          className="grid size-5 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Remover “${term}” do histórico`}
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </TermRow>
                ) : null}

                {topCategories.length > 0 ? (
                  <TermRow
                    icon={<Lightbulb className="size-3.5" aria-hidden="true" />}
                    title="Temas com conteúdo publicado"
                  >
                    {topCategories.map((facet) => (
                      <button
                        key={facet.value}
                        type="button"
                        onClick={() => patch({ category: facet.value })}
                        className="press rounded-full border border-hairline bg-surface px-3 py-1 text-sm font-medium text-muted transition-colors hover:border-hairline-strong hover:text-foreground"
                      >
                        {facet.value}
                        <span className="ml-1.5 text-xs font-bold text-muted" data-numeric>
                          {facet.count}
                        </span>
                      </button>
                    ))}
                  </TermRow>
                ) : null}
              </div>
            ) : null}
          </Rise>
        </div>
      </section>

      <section ref={resultsRef} className="editorial-container scroll-mt-24 py-8 sm:py-10">
        <SearchFilters
          state={state}
          counts={counts}
          categories={response.categories}
          onPatch={patch}
          onReset={reset}
          hasFilters={filtersActive}
          idPrefix={idPrefix}
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          {/*
            `role="status"` + `aria-live="polite"`: quem usa leitor de tela
            precisa saber que a lista mudou sem ter que sair caçando.
          */}
          <p role="status" aria-live="polite" className="text-sm text-muted">
            {isInitialLoading ? (
              "Buscando…"
            ) : hasQuery ? (
              <>
                <strong className="font-bold text-foreground" data-numeric>
                  {totalCount}
                </strong>{" "}
                {totalCount === 1 ? "resultado" : "resultados"} para{" "}
                <strong className="text-foreground">“{response.query || state.query}”</strong>
              </>
            ) : (
              <>
                Explorando{" "}
                <strong className="font-bold text-foreground" data-numeric>
                  {totalCount}
                </strong>{" "}
                {totalCount === 1 ? "item publicado" : "itens publicados"}
              </>
            )}
          </p>

          {isRefreshing ? (
            <span className="flex items-center gap-2 text-xs font-semibold text-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
              Atualizando
            </span>
          ) : null}
        </div>

        {response.didYouMean && hasQuery ? (
          <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-hairline bg-warning-soft/40 px-4 py-3 text-sm text-foreground">
            <Compass className="size-4 shrink-0 text-warning" aria-hidden="true" />
            {response.suggestedTerm ? (
              <>
                {/*
                  Nomear a palavra é o que separa um aviso de uma saída: a
                  pessoa clica e a busca vira a que ela queria, em vez de ter
                  que adivinhar a grafia sozinha.
                */}
                <span>Você quis dizer</span>
                <button
                  type="button"
                  onClick={() => submit(response.suggestedTerm ?? "")}
                  className="press font-bold text-accent underline-grow"
                >
                  {response.suggestedTerm}
                </button>
                <span>? Enquanto isso, o mais parecido com</span>
                <span className="font-semibold">“{state.query}”:</span>
              </>
            ) : (
              <span>
                Nada casou exatamente com <strong>“{state.query}”</strong>. Estes são os conteúdos
                com nome mais parecido.
              </span>
            )}
          </p>
        ) : null}

        <div
          className="mt-6"
          id={searchPanelId(idPrefix)}
          role="tabpanel"
          aria-labelledby={searchTabId(idPrefix, state.type)}
          // O painel não recebe foco próprio: as setas já andam pelas abas e o
          // Tab a partir da aba ativa cai direto no primeiro cartão.
          tabIndex={-1}
        >
          {showSkeleton ? (
            <SearchSkeletons />
          ) : hasResults ? (
            <div
              className={cn(
                "transition-opacity duration-200",
                isRefreshing && "pointer-events-none opacity-60",
              )}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item, index) => (
                  <SearchResultCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    query={state.query}
                    featured={hasQuery && state.page === 1 && index === 0}
                    // Posição absoluta na busca, não no lote da página: é o
                    // que permite ler "abriram o 27º resultado" depois.
                    position={(state.page - 1) * (response.page.size || SEARCH_PAGE_SIZE) + index + 1}
                    onOpen={(opened, position) => reportClick(opened.id, opened.type, position)}
                  />
                ))}
              </div>

              <SearchPagination
                page={state.page}
                pageSize={response.page.size || SEARCH_PAGE_SIZE}
                totalCount={response.totalCount}
                onPageChange={goToPage}
              />
            </div>
          ) : (
            <EmptyResults
              query={state.query}
              hasFilters={filtersActive}
              typeLabel={SEARCH_TABS.find((tab) => tab.id === state.type)?.label}
              isTypeFiltered={state.type !== "all"}
              isCategoryFiltered={state.category !== ALL_CATEGORIES}
              onClearType={() => patch({ type: "all" })}
              onClearCategory={() => patch({ category: ALL_CATEGORIES })}
              onReset={reset}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function TermRow({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * Vazio que oferece a saída, não só o diagnóstico.
 *
 * Quando há filtro ativo, o caminho mais curto para ver resultado quase nunca
 * é digitar outra coisa: é afrouxar o filtro. Então os botões removem
 * exatamente o filtro que está estreitando a busca.
 */
function EmptyResults({
  query,
  hasFilters,
  typeLabel,
  isTypeFiltered,
  isCategoryFiltered,
  onClearType,
  onClearCategory,
  onReset,
}: {
  query: string;
  hasFilters: boolean;
  typeLabel?: string;
  isTypeFiltered: boolean;
  isCategoryFiltered: boolean;
  onClearType: () => void;
  onClearCategory: () => void;
  onReset: () => void;
}) {
  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-2xl border border-dashed border-hairline-strong bg-surface/40 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-background-secondary text-muted">
        <Search className="size-6" aria-hidden="true" />
      </span>

      <h2 className="display-3 mt-4 text-foreground">
        {hasQuery ? "Nada por aqui com esses termos" : "Nenhum conteúdo publicado ainda"}
      </h2>

      <p className="lede mx-auto mt-2 max-w-md text-sm text-muted">
        {!hasQuery
          ? "Assim que houver curso, aula ou artigo publicado, ele aparece nesta lista."
          : isTypeFiltered || isCategoryFiltered
            ? "O termo pode ter resultado em outra aba ou categoria — vale afrouxar o filtro antes de trocar as palavras."
            : "Tente uma palavra mais curta, o nome do curso ou o tema. A busca já tolera acento e erro de digitação."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {isTypeFiltered ? (
          <Button variant="secondary" size="sm" onPress={onClearType}>
            Buscar em tudo{typeLabel ? `, não só em ${typeLabel.toLowerCase()}` : ""}
          </Button>
        ) : null}
        {isCategoryFiltered ? (
          <Button variant="secondary" size="sm" onPress={onClearCategory}>
            Remover filtro de categoria
          </Button>
        ) : null}
        {hasFilters ? (
          <Button variant="primary" size="sm" onPress={onReset}>
            Recomeçar a busca
          </Button>
        ) : null}
      </div>
    </div>
  );
}
