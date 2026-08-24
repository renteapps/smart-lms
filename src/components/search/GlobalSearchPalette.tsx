"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { getSearchSuggestions } from "@/app/actions/search";
import { HighlightedText } from "@/components/search/HighlightedText";
import { SEARCH_TYPE_VISUALS } from "@/components/search/searchResultMeta";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFAULT_SEARCH_STATE, OPEN_SEARCH_EVENT, searchStateToHref } from "@/lib/searchQueryState";
import { cn } from "@/lib/utils";
import type { SearchSuggestion } from "@/types/search";

/**
 * Busca chamável de qualquer tela, por ⌘K / Ctrl+K.
 *
 * Antes o atalho só existia dentro da própria `/busca` — o que obrigava a
 * navegar até a busca para poder buscar. Aqui ele vira o que se espera de um
 * atalho: a busca vem até a pessoa.
 *
 * Duas coisas deliberadas:
 *
 *  - **Não monta em `/busca`.** Lá o campo já é o assunto da tela e tem o
 *    próprio ⌘K; dois ouvintes disputando a mesma tecla é bug garantido.
 *  - **Enter sem seleção vai para a busca completa** com o termo digitado.
 *    A lista aqui é atalho para o destino óbvio, não a resposta final.
 */

const DEBOUNCE_MS = 160;
const MIN_LENGTH = 2;

export function GlobalSearchPalette() {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // Termo cuja resposta já chegou; comparar com o atual dá o "carregando"
  // sem uma flag que alguém precise lembrar de baixar.
  const [settledTerm, setSettledTerm] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);
  const listboxId = useId();

  const debounced = useDebounce(term, DEBOUNCE_MS);
  const isSearchPage = pathname === "/busca";

  /*
   * A paleta é sempre sobre a tela atual: trocou de rota, fecha. Ajuste
   * durante o render (mesmo padrão de `NotesClient`) em vez de efeito —
   * fechar por efeito renderizaria a paleta uma vez sobre a tela nova antes
   * de sumir, que é exatamente o piscar que se quer evitar.
   */
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
    setTerm("");
    setSuggestions([]);
    setActiveKey(null);
  }

  const close = useCallback(() => {
    setOpen(false);
    setTerm("");
    setSuggestions([]);
    setActiveKey(null);
  }, []);

  // ⌘K / Ctrl+K abre; Esc fecha. Fora da /busca, que tem o seu próprio.
  useEffect(() => {
    if (isSearchPage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };

    const onExternalRequest = () => setOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onExternalRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onExternalRequest);
    };
  }, [isSearchPage]);


  useEffect(() => {
    const query = debounced.trim();
    if (!isOpen || query.length < MIN_LENGTH) return;

    const seq = seqRef.current + 1;
    seqRef.current = seq;
    let active = true;

    getSearchSuggestions(query, 7)
      .then((result) => {
        if (!active || seqRef.current !== seq) return;
        setSuggestions(result);
        setSettledTerm(query);
      })
      .catch(() => {
        if (!active || seqRef.current !== seq) return;
        setSuggestions([]);
        setSettledTerm(query);
      });

    return () => {
      active = false;
    };
  }, [debounced, isOpen]);

  if (isSearchPage || !isOpen) return null;

  const query = term.trim();
  const visible = query.length >= MIN_LENGTH ? suggestions : [];
  const isLoading = query.length >= MIN_LENGTH && settledTerm !== query;
  const activeIndex = activeKey ? visible.findIndex((item) => item.url === activeKey) : -1;

  const goToFullSearch = () => {
    if (!query) return;
    close();
    router.push(searchStateToHref({ ...DEFAULT_SEARCH_STATE, query }));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown" && visible.length > 0) {
      event.preventDefault();
      setActiveKey(visible[(activeIndex + 1) % visible.length].url);
      return;
    }

    if (event.key === "ArrowUp" && visible.length > 0) {
      event.preventDefault();
      const next = activeIndex <= 0 ? visible.length - 1 : activeIndex - 1;
      setActiveKey(visible[next].url);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = activeIndex >= 0 ? visible[activeIndex] : null;
      if (chosen) {
        close();
        router.push(chosen.url);
      } else {
        goToFullSearch();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center px-4 pt-[12vh]"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="absolute inset-0 bg-overlay/40 backdrop-blur-sm" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar na plataforma"
        className="material-thick relative w-full max-w-xl overflow-hidden rounded-2xl border border-hairline shadow-elev-4"
      >
        <div className="flex items-center gap-2 border-b border-hairline px-4">
          <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            /*
             * A paleta só existe porque alguém a invocou; abrir sem foco no
             * campo obrigaria a um clique logo depois do atalho de teclado.
             */
            autoFocus
            type="text"
            role="combobox"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar cursos, aulas, agentes, artigos…"
            className="w-full bg-transparent py-4 text-base font-semibold text-foreground placeholder:font-medium placeholder:text-muted focus:outline-none"
            aria-label="Buscar na plataforma"
            aria-expanded={visible.length > 0}
            aria-controls={visible.length > 0 ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
          {isLoading ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-hidden="true" />
          ) : (
            <kbd className="shrink-0 rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-xs font-semibold text-muted">
              esc
            </kbd>
          )}
        </div>

        {visible.length > 0 ? (
          <ul id={listboxId} role="listbox" aria-label="Sugestões" className="max-h-80 overflow-y-auto py-1">
            {visible.map((suggestion, index) => {
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
                    onMouseDown={(event) => {
                      event.preventDefault();
                      close();
                      router.push(suggestion.url);
                    }}
                    onMouseEnter={() => setActiveKey(suggestion.url)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isActive ? "bg-surface-hover" : "hover:bg-surface-hover",
                    )}
                    tabIndex={-1}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-md", visual.tone)}>
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        <HighlightedText text={suggestion.title} query={term} />
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

        {term.trim() ? (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              goToFullSearch();
            }}
            className="flex w-full items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-left text-sm transition-colors hover:bg-surface-hover"
          >
            <span className="min-w-0 truncate text-muted">
              Ver todos os resultados para{" "}
              <strong className="text-foreground">“{term.trim()}”</strong>
            </span>
            <CornerDownLeft className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
          </button>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Digite ao menos {MIN_LENGTH} letras. A busca entende acento e erro de digitação.
          </p>
        )}
      </div>
    </div>
  );
}
