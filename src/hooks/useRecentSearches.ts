import { useState, useEffect, useCallback } from "react";

const RECENT_SEARCHES_KEY = "smartlms_recent_searches";
const MAX_RECENT_SEARCHES = 5;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load recent searches", e);
    }
    setIsLoaded(true);
  }, []);

  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      // Remove o termo se já existir para não ter duplicatas
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      // Adiciona no início da lista
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save recent search", e);
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {
      // ignore
    }
  }, []);

  const removeSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  }, []);

  return { recentSearches, addRecentSearch, clearRecentSearches, removeSearch, isLoaded };
}
