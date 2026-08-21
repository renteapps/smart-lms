"use client";

import Image from "next/image";
import Link from "next/link";
import { Award, BookOpen, Play } from "lucide-react";
import { EmptyState, buttonVariants } from "@heroui/react";
import { CourseIcon } from "@/components/ui/AnimatedIcon";
import { Rise } from "@/components/ui/Rise";
import LessonThumbCard from "@/components/LessonThumbCard";
import type { CourseOverviewData, GalleryLesson } from "@/types/course";

type CourseGalleryClientProps = {
  course: CourseOverviewData;
  lessons: GalleryLesson[];
  nextLesson: GalleryLesson | null;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  isCompleted?: boolean;
  certificateUrl?: string | null;
};

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=90&w=1800&auto=format&fit=crop";

/**
 * Capa do curso galeria: uma coleção de aulas avulsas (masterclasses), sem
 * módulos. Onde `CourseOverviewClient` mostra um plano acordeão, aqui a lista
 * vira uma grade de thumbs verticais — a mesma unidade visual do carrossel da
 * home, só que todas de uma vez.
 */
export default function CourseGalleryClient({
  course,
  lessons,
  nextLesson,
  totalLessons,
  completedLessons,
  progressPercentage,
  isCompleted = false,
  certificateUrl,
}: CourseGalleryClientProps) {
  const isCertificateEnabled = course.enableCertificates !== false;
  const targetCertificateUrl = certificateUrl || `/certificados?curso=${encodeURIComponent(course.id)}`;
  const heroCover = (course.coverUrl && course.coverUrl.trim() !== "") ? course.coverUrl : FALLBACK_COVER;

  return (
    <div className="min-h-screen pt-20 sm:pt-[76px]">
      <section className="editorial-container py-5 sm:py-8 lg:py-10">
        <div className="relative isolate overflow-hidden rounded-xl sm:rounded-2xl bg-foreground shadow-elev-4">
          <Image
            src={heroCover}
            alt={`Capa do curso ${course.title}`}
            fill
            unoptimized
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 95vw, 1280px"
            className="object-cover opacity-50 sm:opacity-55"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/90 to-foreground/75 sm:bg-gradient-to-r sm:from-foreground sm:via-foreground/90 sm:to-foreground/30"
          />

          <div className="relative z-10 max-w-3xl px-5 py-8 sm:px-8 sm:py-12 md:px-10 md:py-16 lg:px-14 lg:py-20">
            <p className="eyebrow text-background/70 text-[11px] sm:text-xs tracking-wider">
              {course.category || "Geral"} · Coleção de aulas
            </p>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:display-1 mt-3 sm:mt-4 font-extrabold text-background tracking-tight leading-[1.1] break-words">
              {course.title}
            </h1>
            <p className="lede mt-3 sm:mt-5 text-sm sm:text-base md:text-lg text-background/80 max-w-2xl leading-relaxed">
              {course.description}
            </p>

            <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-2.5">
              <span className="material-thin flex items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold text-background">
                <BookOpen className="size-3.5 sm:size-4" aria-hidden="true" />
                <span data-numeric>{totalLessons} aulas</span>
              </span>
              {progressPercentage > 0 && (
                <span className="material-thin flex items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold text-background">
                  <span data-numeric>{progressPercentage}% assistido</span>
                </span>
              )}
            </div>

            {isCompleted && isCertificateEnabled ? (
              <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href={targetCertificateUrl}
                  className={buttonVariants({
                    variant: "primary",
                    size: "lg",
                    className: "press w-full sm:w-auto inline-flex items-center justify-center gap-2",
                  })}
                >
                  <Award className="size-4" aria-hidden="true" />
                  Baixar certificado
                </Link>
              </div>
            ) : nextLesson ? (
              <div className="mt-7 sm:mt-9">
                <Link
                  href={nextLesson.href}
                  className={buttonVariants({
                    variant: "primary",
                    size: "lg",
                    className: "press w-full sm:w-auto inline-flex items-center justify-center gap-2",
                  })}
                >
                  <Play className="size-4 fill-current" aria-hidden="true" />
                  {completedLessons === 0 ? "Começar" : "Continuar assistindo"}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="editorial-container pb-16 sm:pb-24">
        <Rise>
          <header className="mb-5 sm:mb-7">
            <p className="eyebrow text-[11px] sm:text-xs">Galeria</p>
            <h2 className="display-3 sm:display-2 mt-1.5 sm:mt-2 text-foreground">Todas as aulas</h2>
          </header>
        </Rise>

        {lessons.length === 0 ? (
          <EmptyState className="py-12 sm:py-16">
            <span className="icon-draw mx-auto grid size-12 sm:size-14 place-items-center rounded-2xl bg-background-secondary text-muted">
              <CourseIcon size={24} />
            </span>
            <p className="mt-4 sm:mt-5 font-display text-base sm:text-lg font-bold text-foreground">Conteúdo a caminho</p>
            <p className="mt-1.5 text-xs sm:text-sm text-muted">As aulas deste curso ainda estão sendo publicadas.</p>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
            {lessons.map((lesson, index) => (
              <Rise key={lesson.id} delay={Math.min(index, 8) * 40}>
                <LessonThumbCard lesson={lesson} className="w-full max-w-none" eager={index < 5} />
              </Rise>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
