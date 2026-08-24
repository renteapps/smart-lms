"use client";

import { useRef } from "react";
import { Label, ListBox, ListBoxItem, Select } from "@heroui/react";
import { RotateCcw, X } from "lucide-react";
import { SEARCH_TABS } from "@/components/search/searchResultMeta";
import { cn } from "@/lib/utils";
import {
  ALL_CATEGORIES,
  type SearchCategoryFacet,
  type SearchCountsByType,
  type SearchQueryState,
  type SearchSortOption,
  type SearchTabType,
} from "@/types/search";

const SORT_LABELS: Record<SearchSortOption, string> = {
  relevance: "Mais relevantes",
  recent: "Mais recentes",
  az: "Ordem alfabética",
};

interface SearchFiltersProps {
  state: SearchQueryState;
  counts: SearchCountsByType;
  categories: SearchCategoryFacet[];
  onPatch: (patch: Partial<SearchQueryState>) => void;
  onReset: () => void;
  hasFilters: boolean;
  /** Prefixo compartilhado com a tela, para ligar aba ao painel de resultados. */
  idPrefix: string;
}

export function searchTabId(idPrefix: string, type: SearchTabType): string {
  return `${idPrefix}-tab-${type}`;
}

export function searchPanelId(idPrefix: string): string {
  return `${idPrefix}-panel`;
}

/**
 * Abas de tipo + categoria + ordenação.
 *
 * As contagens vêm da faceta calculada no banco com todos os *outros* filtros
 * aplicados — o número ao lado da aba é o que ela realmente entregaria se
 * fosse clicada. Aba com zero fica visível, porém desativada: sumir com ela
 * faria a barra dançar a cada tecla digitada.
 *
 * O padrão de abas do WAI-ARIA é pacote fechado: quem declara `role="tab"`
 * assume também o `tabindex` rotativo (um único ponto de parada no Tab, as
 * setas andam entre as abas) e o `aria-controls` apontando para o painel.
 * Declarar só o papel é pior do que usar botões comuns — promete a semântica
 * a quem usa leitor de tela e não entrega a navegação.
 */
export function SearchFilters({
  state,
  counts,
  categories,
  onPatch,
  onReset,
  hasFilters,
  idPrefix,
}: SearchFiltersProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const isTabEnabled = (type: SearchTabType) => counts[type] > 0 || state.type === type;
  const enabledPositions = SEARCH_TABS.reduce<number[]>((positions, tab, index) => {
    if (isTabEnabled(tab.id)) positions.push(index);
    return positions;
  }, []);

  // Ativação automática: a aba focada pela seta já aplica o filtro, que é o
  // comportamento esperado quando trocar de aba não custa uma navegação.
  const moveToTab = (position: number) => {
    const tab = SEARCH_TABS[position];
    if (!tab) return;
    tabRefs.current[position]?.focus();
    onPatch({ type: tab.id });
  };

  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const current = enabledPositions.indexOf(index);
    if (current === -1 || enabledPositions.length === 0) return;

    let target: number | undefined;
    switch (event.key) {
      case "ArrowRight":
        target = enabledPositions[(current + 1) % enabledPositions.length];
        break;
      case "ArrowLeft":
        target = enabledPositions[(current - 1 + enabledPositions.length) % enabledPositions.length];
        break;
      case "Home":
        target = enabledPositions[0];
        break;
      case "End":
        target = enabledPositions[enabledPositions.length - 1];
        break;
      default:
        return;
    }

    event.preventDefault();
    if (target !== undefined) moveToTab(target);
  };

  const categoryOptions = [
    { id: ALL_CATEGORIES, label: "Todas as categorias" },
    ...categories.map((facet) => ({
      id: facet.value,
      label: `${facet.value} (${facet.count})`,
    })),
  ];

  // Categoria escolhida antes pode não estar entre as opções atuais — mantê-la
  // na lista é o que permite desfazer o filtro em vez de ficar preso nele.
  if (state.category !== ALL_CATEGORIES && !categories.some((f) => f.value === state.category)) {
    categoryOptions.push({ id: state.category, label: `${state.category} (0)` });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filtrar por tipo de conteúdo"
          className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 no-scrollbar lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0"
        >
          {SEARCH_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const count = counts[tab.id];
            const isActive = state.type === tab.id;
            const isEmpty = !isTabEnabled(tab.id);

            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={searchTabId(idPrefix, tab.id)}
                aria-selected={isActive}
                aria-controls={searchPanelId(idPrefix)}
                // Um único ponto de parada no Tab; as setas cuidam do resto.
                tabIndex={isActive ? 0 : -1}
                disabled={isEmpty}
                onClick={() => onPatch({ type: tab.id })}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  "press flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  isActive
                    ? "bg-accent-soft text-accent-soft-foreground"
                    : "text-muted hover:bg-surface-hover hover:text-foreground",
                  isEmpty && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-bold",
                    isActive ? "bg-accent/20" : "bg-background-secondary",
                  )}
                  data-numeric
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 1 ? (
            <Select
              selectedKey={state.category}
              onSelectionChange={(key) => onPatch({ category: String(key) })}
              className="min-w-44"
            >
              <Label className="sr-only">Categoria</Label>
              <Select.Trigger className="h-10">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {categoryOptions.map((option) => (
                    <ListBoxItem key={option.id} id={option.id}>
                      {option.label}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ) : null}

          <Select
            selectedKey={state.sort}
            onSelectionChange={(key) => onPatch({ sort: String(key) as SearchSortOption })}
            className="min-w-40"
          >
            <Label className="sr-only">Ordenar por</Label>
            <Select.Trigger className="h-10">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {(Object.keys(SORT_LABELS) as SearchSortOption[]).map((option) => (
                  <ListBoxItem key={option} id={option}>
                    {SORT_LABELS[option]}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Filtros ativos:</span>

          {state.query ? (
            <FilterChip label={`“${state.query}”`} onRemove={() => onPatch({ query: "" })} />
          ) : null}
          {state.type !== "all" ? (
            <FilterChip
              label={SEARCH_TABS.find((tab) => tab.id === state.type)?.label ?? state.type}
              onRemove={() => onPatch({ type: "all" })}
            />
          ) : null}
          {state.category !== ALL_CATEGORIES ? (
            <FilterChip
              label={state.category}
              onRemove={() => onPatch({ category: ALL_CATEGORIES })}
            />
          ) : null}
          {state.sort !== "relevance" ? (
            <FilterChip
              label={SORT_LABELS[state.sort]}
              onRemove={() => onPatch({ sort: "relevance" })}
            />
          ) : null}

          <button
            type="button"
            onClick={onReset}
            className="press flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-muted underline-grow transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Limpar tudo
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-hairline bg-surface py-1 pl-2.5 pr-1 text-xs font-semibold text-foreground">
      <span className="max-w-40 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="grid size-4.5 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger-soft-foreground"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
