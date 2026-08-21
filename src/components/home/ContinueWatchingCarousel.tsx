"use client";

import { PlayCircle } from "lucide-react";
import CarouselRow from "@/components/CarouselRow";
import ContinueWatchingCard from "@/components/ContinueWatchingCard";
import type { ContinueLesson } from "@/types/course";

/**
 * Fileira "Continuar assistindo" — aulas que o aluno já começou e ainda não
 * concluiu, mais recentes primeiro. Substitui a régua de métricas semanais na
 * home; essas métricas continuam disponíveis em /minha-trilha.
 */
export default function ContinueWatchingCarousel({ lessons }: { lessons: ContinueLesson[] }) {
  if (lessons.length === 0) return null;

  return (
    <CarouselRow
      title="Continuar assistindo"
      label="Aulas em andamento"
      titleIcon={
        <span className="icon-draw grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
          <PlayCircle size={18} aria-hidden="true" />
        </span>
      }
    >
      {lessons.map((lesson, index) => (
        <ContinueWatchingCard key={lesson.id} lesson={lesson} eager={index < 2} />
      ))}
    </CarouselRow>
  );
}
