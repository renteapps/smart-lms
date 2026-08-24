import { foldForMatch } from "@/lib/searchHighlight";

/**
 * Regras de composição do histórico de buscas.
 *
 * A lista que aparece na tela é a soma de duas origens com papéis diferentes:
 *
 *  - **servidor** (`search_events`): o histórico de verdade, que atravessa
 *    dispositivos;
 *  - **navegador** (`localStorage`): eco imediato do que acabou de ser
 *    buscado, porque o registro no servidor só acontece depois que a busca
 *    assenta — esperar por ele deixaria a lista sempre um passo atrás.
 *
 * O "x" de remover é **dispensa local**, não exclusão do evento. Apagar a
 * linha do banco destruiria a estatística de lacuna de catálogo para agradar
 * uma preferência de exibição; a dispensa não acompanha o dispositivo, e esse
 * é um preço bem menor.
 *
 * Funções puras, sem tocar em `localStorage`: quem persiste é o hook.
 */

export const MAX_RECENT_SEARCHES = 6;

/** Mesma chave de agrupamento do banco: sem acento e em minúsculas. */
export function recentSearchKey(term: string): string {
  return foldForMatch(term.trim());
}

export function normalizeTerms(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === "string" && value.trim() !== "");
}

/**
 * Junta as duas origens, tira repetição por forma normalizada e aplica as
 * dispensas. O que veio do navegador entra primeiro: é o mais recente.
 */
export function mergeRecentSearches(
  local: readonly string[],
  remote: readonly string[],
  dismissed: readonly string[] = [],
  limit: number = MAX_RECENT_SEARCHES,
): string[] {
  const ignored = new Set(dismissed.map(recentSearchKey));
  const seen = new Set<string>();
  const output: string[] = [];

  for (const term of [...local, ...remote]) {
    const trimmed = term.trim();
    if (!trimmed) continue;

    const key = recentSearchKey(trimmed);
    if (!key || ignored.has(key) || seen.has(key)) continue;

    seen.add(key);
    output.push(trimmed);
    if (output.length >= limit) break;
  }

  return output;
}

/** Coloca o termo na frente, sem deixar duplicata de grafia acentuada. */
export function pushRecentSearch(
  current: readonly string[],
  term: string,
  limit: number = MAX_RECENT_SEARCHES,
): string[] {
  const trimmed = term.trim();
  if (!trimmed) return [...current];

  const key = recentSearchKey(trimmed);
  return [trimmed, ...current.filter((item) => recentSearchKey(item) !== key)].slice(0, limit);
}

export function dropRecentSearch(current: readonly string[], term: string): string[] {
  const key = recentSearchKey(term);
  return current.filter((item) => recentSearchKey(item) !== key);
}
