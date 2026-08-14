import type { Article } from "@/types/blog";

/*
 * Formatadores no escopo do módulo: `Intl.DateTimeFormat` é caro de construir e
 * o custo não se justifica a cada linha da lista.
 */
const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

export function longDate(publishedAt: number) {
  return longDateFormatter.format(new Date(publishedAt));
}

export function shortDate(publishedAt: number) {
  return shortDateFormatter.format(new Date(publishedAt));
}

/**
 * Etiqueta de formato: quanto custa o artigo e em que mídia.
 *
 * Retorna `null` quando o artigo não declara nem áudio nem tempo de leitura —
 * assim quem consome esconde a etiqueta inteira em vez de exibir "undefined min".
 */
export function articleMeta(article: Article): { label: string; isAudio: boolean } | null {
  if (article.format === "audio" && article.audio) {
    return { label: `${Math.round(article.audio.duration / 60)} min`, isAudio: true };
  }

  if (article.format === "both") {
    return { label: "Ouvir ou ler", isAudio: true };
  }

  if (article.readingTime) {
    return { label: `${article.readingTime} min`, isAudio: false };
  }

  return null;
}
