"use client";

import { useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, X } from "lucide-react";
import { HighlightedText } from "@/components/search/HighlightedText";
import { SEARCH_TYPE_VISUALS } from "@/components/search/searchResultMeta";
import { cn } from "@/lib/utils";
import type { SearchSuggestion } from "@/types/search";

interface SearchOmniboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  suggestions: SearchSuggestion[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Índice destacado — vive no controller, derivado da sugestão em si. */
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  isBusy?: boolean;
}

/**
 * Campo de busca com sugestões navegáveis pelo teclado.
 *
 * É um combobox escrito à mão, e não o `SearchField`/`ComboBox` do HeroUI, por
 * um motivo concreto: aqui a lista é *opcional*. Enter sempre busca o que foi
 * digitado, mesmo com a lista aberta e nada destacado — um ComboBox padrão
 * quer que se escolha uma opção. As duas coisas que o componente pronto
 * entregaria (papéis ARIA e navegação por setas) estão implementadas abaixo:
 * `role="combobox"` + `aria-activedescendant` no campo, `role="listbox"` na
 * lista, foco continua no input.
 */
export function SearchOmnibox({
  value,
  onValueChange,
  onSubmit,
  suggestions,
  isOpen,
  onOpen,
  onClose,
  activeIndex,
  onActiveIndexChange,
  isBusy = false,
}: SearchOmniboxProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const showList = isOpen && suggestions.length > 0;

  // `/` e ⌘K/Ctrl+K trazem o foco para cá de qualquer lugar da página.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut || (event.key === "/" && !isTyping)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Clique fora fecha a lista sem tirar o que já foi digitado.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, onClose]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && showList) {
      event.preventDefault();
      onActiveIndexChange((activeIndex + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp" && showList) {
      event.preventDefault();
      onActiveIndexChange(activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const active = showList && activeIndex >= 0 ? suggestions[activeIndex] : null;
      if (active) {
        onClose();
        router.push(active.url);
      } else {
        onSubmit(value);
      }
      return;
    }

    if (event.key === "Escape") {
      if (showList) {
        event.preventDefault();
        onClose();
      } else if (value) {
        event.preventDefault();
        onValueChange("");
        onSubmit("");
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "material-thick relative flex items-center gap-1 rounded-2xl border border-hairline p-2 shadow-elev-2",
          "transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-elev-3",
          showList && "rounded-b-none",
        )}
      >
        <span className="pointer-events-none grid size-10 shrink-0 place-items-center text-muted">
          <Search className="size-5" aria-hidden="true" />
        </span>

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            onOpen();
          }}
          onFocus={onOpen}
          onKeyDown={handleKeyDown}
          placeholder="Busque por cursos, aulas, agentes, artigos ou suas anotações…"
          className={cn(
            "w-full min-w-0 bg-transparent px-1 text-base font-semibold text-foreground",
            "placeholder:font-medium placeholder:text-muted focus:outline-none sm:text-lg",
            // O `x` nativo do type="search" no WebKit briga com o botão próprio.
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
          aria-label="Buscar na plataforma"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
        />

        {isBusy ? (
          <span
            className="mr-1 size-2 shrink-0 animate-pulse rounded-full bg-accent"
            aria-hidden="true"
          />
        ) : null}

        {value ? (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              onSubmit("");
              inputRef.current?.focus();
            }}
            className="press grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <kbd className="mr-2 hidden shrink-0 items-center gap-0.5 rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-xs font-semibold text-muted sm:flex">
            <span aria-hidden="true">⌘</span>
            <span>K</span>
          </kbd>
        )}
      </div>

      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Sugestões de busca"
          className="material-thick absolute inset-x-0 top-full z-30 overflow-hidden rounded-b-2xl border border-t-0 border-hairline shadow-elev-4"
        >
          {suggestions.map((suggestion, index) => {
            const visual = SEARCH_TYPE_VISUALS[suggestion.type];
            const Icon = visual.icon;
            const isActive = index === activeIndex;

            return (
              <li
                key={`${suggestion.type}-${suggestion.url}`}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  // `onMouseDown` em vez de `onClick`: o blur do input dispara
                  // antes do click e fecharia a lista sob o cursor.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onClose();
                    router.push(suggestion.url);
                  }}
                  onMouseEnter={() => onActiveIndexChange(index)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-surface-hover" : "hover:bg-surface-hover",
                  )}
                  tabIndex={-1}
                >
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-md", visual.tone)}>
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      <HighlightedText text={suggestion.title} query={value} />
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {visual.label}
                      {suggestion.category ? ` · ${suggestion.category}` : ""}
                    </span>
                  </span>

                  {isActive ? (
                    <CornerDownLeft className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
