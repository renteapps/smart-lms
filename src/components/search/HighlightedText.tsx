import { Fragment } from "react";
import { highlightTerms, parseSnippet, type HighlightSegment } from "@/lib/searchHighlight";
import { cn } from "@/lib/utils";

/**
 * Renderiza segmentos marcados como nós React.
 *
 * Existe um `<mark>` de verdade em volta do trecho encontrado — leitor de tela
 * anuncia, `Ctrl+F` do navegador continua funcionando, e o destaque não
 * depende de `dangerouslySetInnerHTML` (ver `searchHighlight.ts`).
 */
function renderSegments(segments: HighlightSegment[], markClassName?: string) {
  return segments.map((segment, index) =>
    segment.marked ? (
      <mark
        key={index}
        className={cn(
          "rounded-xs bg-accent-soft px-0.5 font-semibold text-accent-soft-foreground",
          markClassName,
        )}
      >
        {segment.text}
      </mark>
    ) : (
      <Fragment key={index}>{segment.text}</Fragment>
    ),
  );
}

export function HighlightedText({
  text,
  query,
  markClassName,
}: {
  text: string;
  query?: string | null;
  markClassName?: string;
}) {
  if (!text) return null;
  return <>{renderSegments(highlightTerms(text, query), markClassName)}</>;
}

/** Trecho do corpo do documento, já marcado pelo `ts_headline`. */
export function HighlightedSnippet({
  snippet,
  markClassName,
}: {
  snippet: string | null | undefined;
  markClassName?: string;
}) {
  const segments = parseSnippet(snippet);
  if (segments.length === 0) return null;
  return <>{renderSegments(segments, markClassName)}</>;
}
