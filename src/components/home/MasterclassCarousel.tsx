"use client";

import Link from "next/link";
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02";
import { buttonVariants } from "@heroui/react";
import CarouselRow from "@/components/CarouselRow";
import LessonThumbCard from "@/components/LessonThumbCard";
import { CourseIcon } from "@/components/ui/AnimatedIcon";
import type { HomeCarouselRow } from "@/types/course";

/**
 * Vitrine de masterclasses na home — uma fileira por curso galeria com o
 * carrossel ativado, com as 8 primeiras aulas na ordem definida no painel admin.
 *
 * Aparece para todo mundo, matriculado ou não: quem não tem acesso ao curso
 * vê a mesma fileira, só que as thumbs revelam um cadeado no hover (em vez de
 * um véu permanente) — o convite para conhecer o curso continua sendo a
 * própria imagem, não uma tarja "bloqueado" — e "Acessar" leva à capa,
 * que se adapta sozinha a travado ou não. Ver `getHomeCarouselRows`.
 */
export default function MasterclassCarousel({ rows }: { rows: HomeCarouselRow[] }) {
  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((row) => (
        <CarouselRow
          key={row.courseId}
          title={row.courseTitle}
          label={`Aulas de ${row.courseTitle}`}
          titleIcon={
            <span className="icon-draw grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
              <CourseIcon size={18} />
            </span>
          }
          action={
            <Link
              href={row.courseHref}
              className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0 gap-1.5" })}
            >
              Acessar
              <ArrowRight02Icon size={14} aria-hidden="true" />
            </Link>
          }
        >
          {row.lessons.map((lesson, index) => (
            <LessonThumbCard
              key={lesson.id}
              lesson={lesson}
              size="lg"
              eager={index < 4}
              courseId={row.courseId}
              courseSlug={row.courseSlug}
              courseTitle={row.courseTitle}
              salesUrl={row.salesUrl}
            />
          ))}
        </CarouselRow>
      ))}
    </>
  );
}
