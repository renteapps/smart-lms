"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Clock, Headphones, Lock, Pin, Star, Tag } from "lucide-react";
import { HighlightedSnippet, HighlightedText } from "@/components/search/HighlightedText";
import {
  SEARCH_TYPE_VISUALS,
  formatDuration,
  resultContextLabel,
  resultFooterLabel,
} from "@/components/search/searchResultMeta";
import { snippetToPlainText } from "@/lib/searchHighlight";
import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/types/search";

interface SearchResultCardProps {
  item: SearchResultItem;
  query?: string;
  /** Cartão do primeiro resultado: mais alto, com mais contexto. */
  featured?: boolean;
  /** Posição na lista (1-based), para a telemetria saber o que foi aberto. */
  position?: number;
  onOpen?: (item: SearchResultItem, position: number) => void;
}

/**
 * Um cartão para todos os tipos.
 *
 * A versão anterior tinha um `switch` com cinco layouts quase iguais — cinco
 * lugares para o mesmo ajuste e cinco chances de divergirem. O que de fato
 * muda entre um curso e uma anotação é ícone, rótulo, selo e chamada; tudo
 * isso vem de `searchResultMeta`, e a estrutura é uma só.
 */
export function SearchResultCard({
  item,
  query,
  featured = false,
  position = 0,
  onOpen,
}: SearchResultCardProps) {
  const visual = SEARCH_TYPE_VISUALS[item.type];
  const Icon = visual.icon;
  const meta = item.metadata ?? {};

  const isLocked = item.hasAccess === false || meta.hasAccess === false;
  const duration = formatDuration(meta.duration);
  const footer = resultFooterLabel(item);
  const snippetText = snippetToPlainText(item.snippet);
  const hasSnippet = snippetText.trim().length > 0;

  const chips =
    item.type === "agent"
      ? (meta.skills ?? []).slice(0, 3)
      : item.type === "note"
        ? (meta.tags ?? []).slice(0, 4)
        : (meta.tags ?? []).slice(0, 3);

  return (
    <Link
      href={item.url}
      /*
       * O link é uma navegação de cliente do Next: o documento não é
       * destruído, então a requisição de telemetria disparada aqui termina
       * normalmente. Nada é aguardado — a navegação não espera por ela.
       */
      onClick={() => onOpen?.(item, position)}
      className={cn(
        "lift group relative flex flex-col rounded-2xl border border-hairline bg-surface p-5 text-left shadow-elev-2",
        "transition-[border-color,box-shadow] duration-200 hover:border-hairline-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        featured && "sm:p-6",
      )}
      aria-label={`${visual.label}: ${item.title}`}
    >
      <header className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", visual.tone)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="eyebrow block truncate text-muted">
              {visual.label}
              {" · "}
              {resultContextLabel(item)}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          {isLocked ? (
            <span className="flex items-center gap-1 rounded-full bg-default px-2 py-0.5 text-xs font-semibold text-muted">
              <Lock className="size-3" aria-hidden="true" />
              Travado
            </span>
          ) : null}

          {meta.isCompleted ? (
            <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-soft-foreground">
              <Check className="size-3" aria-hidden="true" />
              Concluída
            </span>
          ) : null}

          {meta.pinned ? (
            <span className="flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground">
              <Pin className="size-3" aria-hidden="true" />
              Fixada
            </span>
          ) : null}

          {!isLocked && duration ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted" data-numeric>
              <Clock className="size-3.5" aria-hidden="true" />
              {duration}
            </span>
          ) : null}

          {item.type === "article" && meta.readingTime ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-muted" data-numeric>
              {meta.hasAudio ? (
                <Headphones className="size-3.5" aria-hidden="true" />
              ) : (
                <Clock className="size-3.5" aria-hidden="true" />
              )}
              {meta.readingTime} min
            </span>
          ) : null}

          {item.type === "agent" && typeof meta.rating === "number" && meta.rating > 0 ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-foreground" data-numeric>
              <Star className="size-3.5 fill-warning text-warning" aria-hidden="true" />
              {meta.rating.toFixed(1)}
            </span>
          ) : null}
        </span>
      </header>

      <h3
        className={cn(
          "mt-3 font-display font-bold tracking-tight text-foreground transition-colors group-hover:text-accent",
          featured ? "text-lg sm:text-xl" : "text-base",
        )}
      >
        <HighlightedText text={item.title} query={query} />
      </h3>

      {/*
        O trecho do `ts_headline` mostra ONDE o termo apareceu no conteúdo, o
        que a descrição fixa não faz. Quando não há trecho (busca sem termo, ou
        aula travada, que não expõe o corpo), a descrição assume.
      */}
      {hasSnippet ? (
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed text-muted",
            featured ? "line-clamp-3" : "line-clamp-2",
          )}
        >
          <HighlightedSnippet snippet={item.snippet} />
        </p>
      ) : item.description ? (
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed text-muted",
            featured ? "line-clamp-3" : "line-clamp-2",
          )}
        >
          <HighlightedText text={item.description} query={query} />
        </p>
      ) : null}

      {chips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="flex items-center gap-1 rounded-md bg-background-secondary px-2 py-0.5 text-xs font-medium text-muted"
            >
              {item.type === "note" ? <Tag className="size-2.5" aria-hidden="true" /> : null}
              {chip}
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-3 text-xs">
        <span className="min-w-0 truncate font-medium text-muted">{footer ?? item.category}</span>
        <span className="flex shrink-0 items-center gap-1 font-bold text-accent">
          {isLocked ? "Ver detalhes" : visual.cta}
          <ArrowUpRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </span>
      </footer>
    </Link>
  );
}
