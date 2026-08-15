"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import CourseCard from "@/components/CourseCard";
import { Rise } from "@/components/ui/Rise";
import type { CatalogCourse } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type DiscoverySectionProps = {
  courses: CatalogCourse[];
  /** Sem trilha não há afinidade para prometer — a copy muda junto. */
  personalized: boolean;
};

/**
 * Descoberta fora da trilha.
 *
 * Substitui o antigo "Recomendado para você", que prometia "uma curadoria
 * baseada nos seus objetivos" sobre um `CATALOG_COURSES.slice(0, 3)` fixo. Agora
 * a ordem vem de `rankCatalogByAffinity`, e quando não há perfil a copy não
 * finge que há.
 */
export default function DiscoverySection({ courses, personalized }: DiscoverySectionProps) {
  if (courses.length === 0) return null;

  return (
    <section className="editorial-container section-rhythm">
      <Rise className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Além da sua trilha</p>
          <h2 className="display-2 mt-3 text-foreground">
            {personalized ? "Mais perto do que você busca" : "Explore o catálogo"}
          </h2>
          <p className="lede mt-4">
            {personalized
              ? "Cursos completos ordenados pela proximidade com o que você respondeu. Nada aqui está agendado — entram na sua trilha só se você quiser."
              : "Cursos completos para você conhecer a plataforma enquanto monta sua trilha."}
          </p>
        </div>
        <Link
          href="/cursos"
          className={cn(buttonVariants({ variant: "outline" }), "icon-rotate shrink-0")}
        >
          Explorar catálogo
          <BookOpen className="size-4" aria-hidden="true" />
        </Link>
      </Rise>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course, index) => (
          <Rise key={course.id} delay={index * 90} className="h-full">
            <CourseCard {...course} className="h-full" />
          </Rise>
        ))}
      </div>
    </section>
  );
}
