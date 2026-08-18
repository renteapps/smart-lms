"use client";

import { useMemo, useSyncExternalStore, useEffect } from "react";
import {
  loadQuestionnaire,
  QUESTIONNAIRE_STORAGE_KEY,
  readLearningTrail,
  TRAIL_STORAGE_KEY,
  saveLearningTrail,
} from "@/lib/trailStorage";
import type { LearningTrail, Questionnaire } from "@/types/trilha";
import { createClient } from "@/lib/supabase/client";

/**
 * A trilha mora no dispositivo, e o dispositivo é um sistema externo ao React.
 *
 * `useSyncExternalStore` é o caminho certo para isso: nada de ler no `useEffect`
 * e chamar `setState` (o que dispara renderização em cascata e é justamente o que
 * a regra `react-hooks/set-state-in-effect` proíbe). De quebra, a home passa a
 * reagir a mudanças feitas em /minha-trilha, na sala de aula ou em outra aba.
 *
 * O snapshot é a **string crua** do storage porque `getSnapshot` precisa devolver
 * um valor referencialmente estável — devolver um objeto recém-parseado a cada
 * chamada colocaria o React num laço infinito. O parse acontece no `useMemo`.
 */

export const TRAIL_CHANGED_EVENT = "smartlms:trail-changed";

/** Chamar depois de gravar a trilha: o evento `storage` não dispara na própria aba. */
export function notifyTrailChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TRAIL_CHANGED_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(TRAIL_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TRAIL_CHANGED_EVENT, onChange);
  };
}

const readTrailRaw = () => window.localStorage.getItem(TRAIL_STORAGE_KEY);
const readQuestionnaireRaw = () => window.localStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
const nullSnapshot = () => null;
const trueSnapshot = () => true;
const falseSnapshot = () => false;

/*
 * Cache por chave: `getSnapshot` precisa ser uma referência estável entre
 * renders, então a função de leitura não pode ser recriada a cada chamada.
 */
const readers = new Map<string, () => string | null>();

function readerFor(key: string) {
  const cached = readers.get(key);
  if (cached) return cached;
  const reader = () => window.localStorage.getItem(key);
  readers.set(key, reader);
  return reader;
}

/**
 * Observa uma chave do localStorage e devolve seu conteúdo cru.
 *
 * Devolve `null` no servidor e no primeiro render do cliente; use junto com
 * `useTrailStore().hydrated` quando precisar distinguir "ainda não li" de "não
 * existe". Reage a `notifyTrailChanged()` e ao evento `storage` de outras abas.
 */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(subscribe, readerFor(key), nullSnapshot);
}

export type TrailStoreValue = {
  /** `false` no servidor e no primeiro render do cliente — mostre o esqueleto. */
  hydrated: boolean;
  trail: LearningTrail | null;
  questionnaire: Questionnaire | null;
  error: "invalid" | "unsupported" | null;
  /** A trilha salva estava num formato antigo e foi convertida na leitura. */
  migrated: boolean;
};

export function useTrailStore(): TrailStoreValue {
  const hydrated = useSyncExternalStore(subscribe, trueSnapshot, falseSnapshot);
  const trailRaw = useSyncExternalStore(subscribe, readTrailRaw, nullSnapshot);
  const questionnaireRaw = useSyncExternalStore(subscribe, readQuestionnaireRaw, nullSnapshot);

  /*
   * O parse recebe a própria string do snapshot, então só refaz o trabalho quando
   * o conteúdo muda de verdade. `readLearningTrail` carrega a migração dos
   * formatos legados, que não vale duplicar aqui.
   */
  const parsed = useMemo(() => {
    if (!hydrated) return { data: null, error: undefined, migrated: false } as const;
    return readLearningTrail(trailRaw);
  }, [hydrated, trailRaw]);

  // Sync with Supabase on mount
  useEffect(() => {
    if (!hydrated) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('student_trails').select('trail_data').eq('user_id', user.id).single()
          .then(({ data, error }) => {
            if (!error && data?.trail_data) {
              const remoteTrail = data.trail_data as LearningTrail;
              const localTrail = parsed.data;
              
              // Only overwrite local if remote is newer or local is missing
              if (!localTrail || (remoteTrail.generatedAt > localTrail.generatedAt)) {
                saveLearningTrail(remoteTrail);
              }
            }
          });
      }
    });
  }, [hydrated]); // Depend only on hydrated to run once after hydration

  const questionnaire = useMemo(
    () => (hydrated ? loadQuestionnaire(questionnaireRaw) : null),
    [hydrated, questionnaireRaw],
  );

  return {
    hydrated,
    trail: parsed.data,
    questionnaire,
    error: parsed.error ?? null,
    migrated: Boolean(parsed.migrated),
  };
}
