"use client";

import { normalizeTerms } from "@/lib/recentSearches";

/**
 * `localStorage` do histórico de buscas tratado como store externa.
 *
 * Duas razões para não deixar isso como `useState` + efeito de leitura:
 *
 *  - ler no efeito cria uma segunda cópia da verdade e uma renderização extra
 *    a cada montagem;
 *  - o mesmo dado é lido pela tela de busca e pode ser lido por outra
 *    superfície depois (a paleta ⌘K, por exemplo) — com store, as duas veem a
 *    mesma coisa sem precisar conversar.
 *
 * O retrato é memorizado porque `useSyncExternalStore` compara por identidade:
 * devolver um objeto novo a cada chamada entraria em laço infinito.
 */

const RECENT_KEY = "smartlms_recent_searches";
const DISMISSED_KEY = "smartlms_recent_searches_dismissed";

export interface RecentSearchesSnapshot {
  recent: string[];
  dismissed: string[];
}

const EMPTY: RecentSearchesSnapshot = { recent: [], dismissed: [] };

let snapshot: RecentSearchesSnapshot | null = null;
const listeners = new Set<() => void>();

function readKey(key: string): string[] {
  try {
    return normalizeTerms(JSON.parse(window.localStorage.getItem(key) ?? "[]"));
  } catch {
    return [];
  }
}

function writeKey(key: string, value: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Modo privativo ou cota estourada: o histórico é conveniência. Perder a
    // gravação não pode derrubar a busca.
  }
}

function emit(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

export function getRecentSearchesSnapshot(): RecentSearchesSnapshot {
  if (typeof window === "undefined") return EMPTY;
  snapshot ??= { recent: readKey(RECENT_KEY), dismissed: readKey(DISMISSED_KEY) };
  return snapshot;
}

export function getRecentSearchesServerSnapshot(): RecentSearchesSnapshot {
  return EMPTY;
}

export function subscribeToRecentSearches(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  // `storage` cobre alteração feita em outra aba do mesmo navegador.
  const handleStorage = (event: StorageEvent) => {
    if (event.key === RECENT_KEY || event.key === DISMISSED_KEY || event.key === null) emit();
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function setStoredRecent(next: string[]): void {
  writeKey(RECENT_KEY, next);
  emit();
}

export function setStoredDismissed(next: string[]): void {
  writeKey(DISMISSED_KEY, next);
  emit();
}
