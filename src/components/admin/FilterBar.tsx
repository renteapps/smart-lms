"use client";

import type { ReactNode } from "react";
import { Button, Card, Label, SearchField } from "@heroui/react";

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder?: string;
  /** Selects/toggles extras, alinhados ao lado da busca. */
  children?: ReactNode;
  /** Contador ou resumo exibido à direita. */
  summary?: ReactNode;
  /** Quando true, mostra "Limpar filtros". */
  hasActiveFilters?: boolean;
  onClear?: () => void;
};

/** Cabeçalho de filtros padrão dos cartões de lista do admin. */
export function FilterBar({
  search,
  onSearchChange,
  searchLabel,
  searchPlaceholder,
  children,
  summary,
  hasActiveFilters,
  onClear,
}: FilterBarProps) {
  return (
    <Card.Header className="flex flex-col gap-4 border-b border-separator pb-5 md:flex-row md:items-center md:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:max-w-2xl">
        <SearchField value={search} onChange={onSearchChange} aria-label={searchLabel} className="w-full sm:max-w-sm">
          <Label className="sr-only">{searchLabel}</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={searchPlaceholder ?? searchLabel} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {children}
        {hasActiveFilters && onClear && (
          <Button size="sm" variant="ghost" onPress={onClear}>
            Limpar filtros
          </Button>
        )}
      </div>
      {summary && <div className="text-xs text-muted">{summary}</div>}
    </Card.Header>
  );
}
