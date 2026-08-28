"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LessonMultiSelectOption {
  id: string;
  title: string;
}

export interface LessonMultiSelectGroup {
  id: string;
  title: string;
  lessons: LessonMultiSelectOption[];
}

interface LessonMultiSelectProps {
  groups: LessonMultiSelectGroup[];
  value: string[];
  onChange: (lessonIds: string[]) => void;
  /** Mostrado quando não há nenhuma aula para escolher. */
  emptyMessage: string;
  searchPlaceholder?: string;
  /** Linha extra à direita de cada aula (fonte de material, duração, etc.). */
  renderMeta?: (lesson: LessonMultiSelectOption) => ReactNode;
  listClassName?: string;
}

/**
 * Lista de aulas agrupada por módulo com busca e seleção múltipla.
 *
 * Extraído de `LessonPrerequisitePicker` quando o modal de criação de pergunta
 * passou a precisar da mesma lista — a diferença entre os dois é só o rótulo e
 * o `renderMeta`, não o comportamento.
 */
export default function LessonMultiSelect({
  groups,
  value,
  onChange,
  emptyMessage,
  searchPlaceholder = "Buscar aula...",
  renderMeta,
  listClassName = "max-h-64",
}: LessonMultiSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups
      .map((group) => ({
        ...group,
        lessons: group.lessons.filter((lesson) => lesson.title.toLowerCase().includes(term)),
      }))
      .filter((group) => group.lessons.length > 0);
  }, [groups, query]);

  const toggle = (lessonId: string) => {
    onChange(value.includes(lessonId) ? value.filter((id) => id !== lessonId) : [...value, lessonId]);
  };

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>

      <div className={cn("overflow-y-auto p-2", listClassName)}>
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted">Nenhuma aula encontrada.</p>
        ) : (
          filtered.map((group) => (
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
                    {renderMeta?.(lesson)}
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
  );
}
