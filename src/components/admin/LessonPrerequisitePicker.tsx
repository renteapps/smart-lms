"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import type { Module } from "@/types/course";
import { cn } from "@/lib/utils";

interface LessonPrerequisitePickerProps {
  modules: Module[];
  /** Aula sendo editada — nunca pode ser pré-requisito de si mesma. */
  currentLessonId?: string;
  value: string[];
  onChange: (lessonIds: string[]) => void;
}

/**
 * Seleciona pré-requisitos entre as aulas do próprio curso.
 *
 * É um seletor de aulas, e não um campo de texto livre, porque o motor da
 * trilha compara pré-requisito com **id de aula** (`candidates.has(id)` em
 * `lib/matching.ts`, e o cadeado de `NextStepHero`/`SessionRest`). Texto solto
 * aqui nunca casaria com nada: a aula deixaria de entrar na trilha em silêncio
 * e ainda geraria aviso de "pré-requisito não encontrado".
 */
export default function LessonPrerequisitePicker({
  modules,
  currentLessonId,
  value,
  onChange,
}: LessonPrerequisitePickerProps) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    return modules
      .map((mod) => ({
        id: mod.id,
        title: mod.title,
        lessons: mod.lessons.filter(
          (lesson) =>
            lesson.id !== currentLessonId &&
            (term === "" || lesson.title.toLowerCase().includes(term)),
        ),
      }))
      .filter((group) => group.lessons.length > 0);
  }, [modules, currentLessonId, query]);

  const toggle = (lessonId: string) => {
    onChange(value.includes(lessonId) ? value.filter((id) => id !== lessonId) : [...value, lessonId]);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">Pré-requisitos</label>
      <p className="text-xs text-muted">
        Aulas que o aluno precisa concluir antes desta. O ClassRank usa isso para ordenar a trilha e travar o que ainda não faz sentido.
      </p>

      {modules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
          Salve o curso com pelo menos um módulo e uma aula para poder definir pré-requisitos.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar aula..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {groups.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted">Nenhuma aula encontrada.</p>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="mb-2 last:mb-0">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{group.title}</p>
                  {group.lessons.map((lesson) => {
                    const selected = value.includes(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => toggle(lesson.id)}
                        aria-pressed={selected}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          selected ? "bg-accent-soft text-accent-soft-foreground" : "hover:bg-surface-secondary",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                            selected ? "border-accent bg-accent text-accent-foreground" : "border-separator",
                          )}
                        >
                          {selected && <Check className="size-3" />}
                        </span>
                        <span className="flex-1 truncate">{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {value.length > 0 && (
            <p className="border-t border-border px-3 py-2 text-xs text-muted">
              {value.length} {value.length === 1 ? "aula selecionada" : "aulas selecionadas"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
