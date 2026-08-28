"use client";

import { useMemo } from "react";
import type { Module } from "@/types/course";
import LessonMultiSelect from "./LessonMultiSelect";

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
  const groups = useMemo(
    () =>
      modules
        .map((mod) => ({
          id: mod.id,
          title: mod.title,
          lessons: mod.lessons
            .filter((lesson) => lesson.id !== currentLessonId)
            .map((lesson) => ({ id: lesson.id, title: lesson.title })),
        }))
        .filter((group) => group.lessons.length > 0),
    [modules, currentLessonId],
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">Pré-requisitos</label>
      <p className="text-xs text-muted">
        Aulas que o aluno precisa concluir antes desta. O ClassRank usa isso para ordenar a trilha e travar o que ainda não faz sentido.
      </p>

      <LessonMultiSelect
        groups={groups}
        value={value}
        onChange={onChange}
        emptyMessage="Salve o curso com pelo menos um módulo e uma aula para poder definir pré-requisitos."
      />
    </div>
  );
}
