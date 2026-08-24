"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getRecentSearches } from "@/app/actions/searchTelemetry";
import {
  dropRecentSearch,
  MAX_RECENT_SEARCHES,
  mergeRecentSearches,
  pushRecentSearch,
} from "@/lib/recentSearches";
import {
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  setStoredDismissed,
  setStoredRecent,
  subscribeToRecentSearches,
} from "@/lib/recentSearchesStore";

/**
 * Histórico de buscas: servidor para atravessar dispositivos, navegador para
 * responder na hora.
 *
 * As regras de composição são puras (`recentSearches.ts`) e a persistência é
 * uma store externa (`recentSearchesStore.ts`). Aqui sobra a costura entre as
 * duas origens e a única coisa realmente assíncrona: buscar o histórico
 * remoto.
 */
const DISMISSED_LIMIT = 60;

export function useRecentSearches() {
  const stored = useSyncExternalStore(
    subscribeToRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot,
  );

  const [remote, setRemote] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    getRecentSearches(MAX_RECENT_SEARCHES)
      .then((terms) => {
        if (active) setRemote(terms);
      })
      .catch(() => {
        // Sem histórico do servidor, a lista fica só com o que é local.
      });

    return () => {
      active = false;
    };
  }, []);

  const recentSearches = useMemo(
    () => mergeRecentSearches(stored.recent, remote, stored.dismissed),
    [stored.recent, stored.dismissed, remote],
  );

  const addRecentSearch = useCallback((term: string) => {
    const atual = getRecentSearchesSnapshot();
    setStoredRecent(pushRecentSearch(atual.recent, term));

    // Buscar de novo um termo dispensado é pedido claro para vê-lo de volta.
    const semDispensa = dropRecentSearch(atual.dismissed, term);
    if (semDispensa.length !== atual.dismissed.length) setStoredDismissed(semDispensa);
  }, []);

  const removeSearch = useCallback((term: string) => {
    const atual = getRecentSearchesSnapshot();
    setStoredRecent(dropRecentSearch(atual.recent, term));
    setStoredDismissed(pushRecentSearch(atual.dismissed, term, DISMISSED_LIMIT));
  }, []);

  const clearRecentSearches = useCallback(() => {
    const atual = getRecentSearchesSnapshot();
    setStoredRecent([]);
    // Dispensa também o que veio do servidor: some da tela como a pessoa pediu,
    // sem apagar o evento que alimenta a estatística de catálogo.
    setStoredDismissed([...remote, ...atual.dismissed].slice(0, DISMISSED_LIMIT));
  }, [remote]);

  return { recentSearches, addRecentSearch, removeSearch, clearRecentSearches };
}
