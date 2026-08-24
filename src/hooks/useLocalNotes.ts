"use client";

import { useSyncExternalStore } from "react";
import { readNotes, type StoredNote } from "@/lib/agentNotes";

/**
 * `localStorage` visto como store externa, e não como estado copiado.
 *
 * Ler no `useEffect` e guardar em `useState` funciona, mas cria uma segunda
 * cópia da verdade e uma renderização extra a cada montagem. `useSyncExternalStore`
 * pede exatamente as três peças que este caso tem: como assinar mudanças, qual
 * é o retrato atual e o que responder no servidor (onde `localStorage` não
 * existe — daí o array vazio, estável, para não quebrar a hidratação).
 *
 * O retrato é memorizado porque `readNotes()` devolve um array novo a cada
 * chamada, e `useSyncExternalStore` compara por identidade: sem o cache, cada
 * render veria uma "mudança" e entraria em laço.
 */

const EMPTY: StoredNote[] = [];

let snapshot: StoredNote[] | null = null;

function getSnapshot(): StoredNote[] {
  snapshot ??= readNotes();
  return snapshot;
}

function getServerSnapshot(): StoredNote[] {
  return EMPTY;
}

function subscribe(onStoreChange: () => void): () => void {
  // `storage` cobre alteração feita em outra aba — o caso em que a lista
  // realmente muda enquanto esta tela está aberta.
  const handleStorage = () => {
    snapshot = null;
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function useLocalNotes(): StoredNote[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
