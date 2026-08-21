"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Award, BookOpen, Brain, CheckCircle2, Clock3, FileText, Play, PlayCircle } from "lucide-react";
import { Card, Chip, Disclosure, EmptyState, ProgressBar, Separator, buttonVariants } from "@heroui/react";
import { CourseIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { Rise } from "@/components/ui/Rise";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import type { CourseOverviewData, CourseOutlineLesson } from "@/types/course";
import { cn } from "@/lib/utils";

type CourseOverviewClientProps = {
  course: CourseOverviewData;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  nextLesson: CourseOutlineLesson | null;
  isCompleted?: boolean;
  certificateUrl?: string | null;
};

const LESSON_KIND: Record<string, string> = {
  profile_test: "Teste de perfil",
  video: "Vídeo",
  quiz: "Quiz",
  text: "Leitura",
};

function lessonIcon(lesson: CourseOutlineLesson) {
  if (lesson.isCompleted) return <CheckCircle2 className="size-4" aria-hidden="true" />;
  if (lesson.type === "profile_test") return <Brain className="size-4" aria-hidden="true" />;
  if (lesson.type === "video") return <PlayCircle className="size-4" aria-hidden="true" />;
  return <FileText className="size-4" aria-hidden="true" />;
}

/**
 * Capa do curso.
 *
 * A imagem do herói é o único gesto expressivo da tela — daí para baixo tudo é
 * superfície calma, para que "o que vem agora" seja a informação mais rápida de
 * achar. O painel de progresso acompanha a rolagem porque é a resposta que a
 * pessoa volta a procurar enquanto navega pelo plano.
 */
const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=90&w=1800&auto=format&fit=crop";

export default function CourseOverviewClient({
  course,
  totalLessons,
  completedLessons,
  progressPercentage,
  nextLesson,
  isCompleted: isCompletedProp,
  certificateUrl,
}: CourseOverviewClientProps) {
  const { triggerTransition } = useCardTransition();
  const isCompleted = isCompletedProp ?? (totalLessons > 0 && completedLessons === totalLessons && progressPercentage === 100);
  const isCertificateEnabled = course.enableCertificates !== false;
  const targetCertificateUrl = certificateUrl || `/certificados?curso=${encodeURIComponent(course.id)}`;
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => Object.fromEntries(course.modules.map((courseModule) => [courseModule.id, true])));
  const totalMinutes = course.modules.reduce((total, courseModule) => total + courseModule.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.durationInMinutes, 0), 0);
  const durationLabel = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`;
  const initialCover = (course.coverUrl && course.coverUrl.trim() !== "") ? course.coverUrl : FALLBACK_COVER;
  const [heroCover, setHeroCover] = useState(initialCover);

  const handleNextLessonClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!nextLesson) return;
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey
    ) {
      return;
    }

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerTransition({
      sourceRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 16,
      },
      metadata: {
        title: nextLesson.title,
        cover: heroCover,
        category: LESSON_KIND[nextLesson.type] ?? "Aula",
        duration: `${nextLesson.durationInMinutes} min`,
        type: "lesson",
      },
      href: `/courses/${course.id}/lessons/${nextLesson.id}`,
    });
  };

  const handleLessonRowClick = (lesson: CourseOutlineLesson, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey
    ) {
      return;
    }

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerTransition({
      sourceRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 12,
      },
      metadata: {
        title: lesson.title,
        cover: heroCover,
        category: LESSON_KIND[lesson.type] ?? "Aula",
        duration: `${lesson.durationInMinutes} min`,
        type: "lesson",
      },
      href: `/courses/${course.id}/lessons/${lesson.id}`,
    });
  };

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
            onError={() => {
              if (heroCover !== FALLBACK_COVER) {
                setHeroCover(FALLBACK_COVER);
              }
            }}
            className="object-cover opacity-50 sm:opacity-55"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/90 to-foreground/75 sm:bg-gradient-to-r sm:from-foreground sm:via-foreground/90 sm:to-foreground/30"
          />

          <div className="relative z-10 max-w-3xl px-5 py-8 sm:px-8 sm:py-12 md:px-10 md:py-16 lg:px-14 lg:py-20">
            <p className="eyebrow text-background/70 text-[11px] sm:text-xs tracking-wider">
              {course.category || "Geral"} · Curso {course.level ? course.level.toLowerCase() : "essencial"}
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
              <span className="material-thin flex items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold text-background">
                <Clock3 className="size-3.5 sm:size-4" aria-hidden="true" />
                <span data-numeric>{durationLabel}</span>
              </span>
              <span className="material-thin flex items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold text-background">
                <Award className="size-3.5 sm:size-4" aria-hidden="true" />
                Certificado incluso
              </span>
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
                {nextLesson && (
                  <Link
                    href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                    onClick={handleNextLessonClick}
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                      className: "press w-full sm:w-auto inline-flex items-center justify-center gap-2 border-background/25 bg-background/10 text-background hover:bg-background/20 hover:text-background",
                    })}
                  >
                    <Play className="size-4 fill-current" aria-hidden="true" />
                    Revisar curso
                  </Link>
                )}
              </div>
            ) : nextLesson ? (
              <div className="mt-7 sm:mt-9">
                <Link
                  href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                  onClick={handleNextLessonClick}
                  className={buttonVariants({
                    variant: "primary",
                    size: "lg",
                    className: "press w-full sm:w-auto inline-flex items-center justify-center gap-2",
                  })}
                >
                  <Play className="size-4 fill-current" aria-hidden="true" />
                  {completedLessons === 0 ? "Começar curso" : "Continuar próxima aula"}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="editorial-container grid gap-6 sm:gap-8 lg:gap-10 pb-16 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {/* No mobile/tablet (<lg), o card de progresso fica no topo para o aluno bater o olho imediatamente */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
          <Reveal edge className="rounded-xl sm:rounded-2xl">
            <Card className="gap-0 p-0 rounded-xl sm:rounded-2xl">
              <Card.Content className="gap-0 p-4.5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-muted">Seu progresso</p>
                    <p className="mt-1 sm:mt-2 font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.045em] text-accent" data-numeric>
                      {progressPercentage}%
                    </p>
                  </div>
                  <span className="grid size-10 sm:size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Award className="size-5 sm:size-6" aria-hidden="true" />
                  </span>
                </div>

                <ProgressBar value={progressPercentage} color="accent" size="md" className="mt-4 sm:mt-5" aria-label="Progresso no curso">
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
                <p className="mt-2 text-xs sm:text-sm font-semibold text-muted" data-numeric>
                  {completedLessons} de {totalLessons} aulas concluídas
                </p>

                <Separator className="my-4 sm:my-6" />

                <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:gap-3.5 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 rounded-lg bg-surface-secondary/50 p-2.5 sm:bg-transparent sm:p-0">
                    <dt className="text-muted text-[11px] sm:text-sm">Tempo estimado</dt>
                    <dd className="font-bold text-foreground text-xs sm:text-sm" data-numeric>{durationLabel}</dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 rounded-lg bg-surface-secondary/50 p-2.5 sm:bg-transparent sm:p-0">
                    <dt className="text-muted text-[11px] sm:text-sm">Certificado</dt>
                    <dd>
                      <Chip color="success" variant="soft" size="sm" className="h-5 sm:h-6 text-[10px] sm:text-xs">
                        Incluso
                      </Chip>
                    </dd>
                  </div>
                </dl>

                {isCompleted && isCertificateEnabled ? (
                  <div className="mt-5 sm:mt-7 flex flex-col gap-2">
                    <Link
                      href={targetCertificateUrl}
                      className={buttonVariants({
                        variant: "primary",
                        fullWidth: true,
                        className: "gap-2",
                      })}
                    >
                      <Award className="size-4" aria-hidden="true" />
                      Baixar certificado
                    </Link>
                    {nextLesson && (
                      <Link
                        href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                        onClick={handleNextLessonClick}
                        className={buttonVariants({
                          variant: "outline",
                          fullWidth: true,
                          className: "gap-2",
                        })}
                      >
                        <Play className="size-4 fill-current" aria-hidden="true" />
                        Revisar curso
                      </Link>
                    )}
                  </div>
                ) : nextLesson ? (
                  <Link
                    href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                    onClick={handleNextLessonClick}
                    className={buttonVariants({ variant: "primary", fullWidth: true, className: "mt-5 sm:mt-7 gap-2" })}
                  >
                    <Play className="size-4 fill-current" aria-hidden="true" />
                    {completedLessons === 0 ? "Começar curso" : "Continuar curso"}
                  </Link>
                ) : null}
              </Card.Content>
            </Card>
          </Reveal>
        </aside>

        <div className="order-2 lg:order-1 min-w-0">
          <Rise>
            <header className="mb-5 sm:mb-7">
              <p className="eyebrow text-[11px] sm:text-xs">Plano do curso</p>
              <h2 className="display-3 sm:display-2 mt-1.5 sm:mt-2 text-foreground break-words">
                O que você vai praticar
              </h2>
            </header>
          </Rise>

          {course.modules.length === 0 ? (
            <EmptyState className="py-12 sm:py-16">
              <span className="icon-draw mx-auto grid size-12 sm:size-14 place-items-center rounded-2xl bg-background-secondary text-muted">
                <CourseIcon size={24} />
              </span>
              <p className="mt-4 sm:mt-5 font-display text-base sm:text-lg font-bold text-foreground">Conteúdo a caminho</p>
              <p className="mt-1.5 text-xs sm:text-sm text-muted">Os módulos deste curso ainda estão sendo publicados.</p>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3.5 sm:gap-4">
              {course.modules.map((courseModule, moduleIndex) => (
                <Rise key={courseModule.id} delay={moduleIndex * 70}>
                  <Card className="gap-0 overflow-hidden p-0 rounded-xl sm:rounded-2xl">
                    <Disclosure
                      isExpanded={expandedModules[courseModule.id]}
                      onExpandedChange={() => setExpandedModules((current) => ({ ...current, [courseModule.id]: !current[courseModule.id] }))}
                    >
                      <Disclosure.Heading level={3}>
                        <Disclosure.Trigger className="flex min-h-16 sm:min-h-20 w-full items-center gap-3 sm:gap-4 p-4 sm:p-6 text-left transition-colors duration-[var(--duration-md)] hover:bg-surface-secondary">
                          <span className="min-w-0 flex-1">
                            <span className="eyebrow block text-accent text-[11px] sm:text-xs">Módulo {courseModule.order}</span>
                            <span className="mt-0.5 sm:mt-1 block font-display text-base sm:text-lg lg:text-xl font-bold tracking-tight text-foreground break-words">
                              {courseModule.title}
                            </span>
                          </span>
                          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            <span className="text-xs font-semibold text-muted" data-numeric>
                              {courseModule.lessons.length} {courseModule.lessons.length === 1 ? "aula" : "aulas"}
                            </span>
                            <Disclosure.Indicator className="text-muted size-4" />
                          </div>
                        </Disclosure.Trigger>
                      </Disclosure.Heading>

                      <Disclosure.Content>
                        <Separator />
                        <ul>
                          {courseModule.lessons.map((lesson, lessonIndex) => (
                            <li key={lesson.id} className="border-b border-separator last:border-b-0">
                              <Link
                                href={`/courses/${course.id}/lessons/${lesson.id}`}
                                onClick={(e) => handleLessonRowClick(lesson, e)}
                                className="group flex min-h-14 sm:min-h-18 items-center gap-3 sm:gap-4 px-3.5 py-3 sm:px-6 sm:py-4 transition-colors duration-[var(--duration-md)] hover:bg-accent-soft/40 active:bg-accent-soft/60"
                              >
                                <span
                                  className={cn(
                                    "grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg transition-colors duration-[var(--duration-md)]",
                                    lesson.isCompleted
                                      ? "bg-success-soft text-success-soft-foreground"
                                      : lesson.type === "profile_test"
                                        ? "bg-accent-soft text-accent-soft-foreground"
                                        : "bg-background-secondary text-muted group-hover:bg-accent-soft group-hover:text-accent-soft-foreground",
                                  )}
                                >
                                  {lessonIcon(lesson)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block text-xs sm:text-sm font-semibold sm:font-bold leading-snug line-clamp-2",
                                      lesson.isCompleted ? "text-muted" : "text-foreground group-hover:text-accent",
                                    )}
                                  >
                                    <span data-numeric>{lessonIndex + 1}.</span> {lesson.title}
                                  </span>
                                  <span className="mt-0.5 sm:mt-1 block text-[11px] sm:text-xs font-medium text-muted">
                                    {LESSON_KIND[lesson.type] ?? "Leitura"}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold text-muted" data-numeric>
                                  <Clock3 className="size-3 sm:size-3.5" aria-hidden="true" />
                                  <span>{lesson.durationInMinutes} min</span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </Disclosure.Content>
                    </Disclosure>
                  </Card>
                </Rise>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
