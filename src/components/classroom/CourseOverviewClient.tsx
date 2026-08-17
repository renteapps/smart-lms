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
import type { Course, Lesson } from "@/types/course";
import { cn } from "@/lib/utils";

type CourseOverviewClientProps = {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  nextLesson: Lesson | null;
};

const LESSON_KIND: Record<string, string> = {
  profile_test: "Teste de perfil",
  video: "Vídeo",
  quiz: "Quiz",
  text: "Leitura",
};

function lessonIcon(lesson: Lesson) {
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
export default function CourseOverviewClient({ course, totalLessons, completedLessons, progressPercentage, nextLesson }: CourseOverviewClientProps) {
  const { triggerTransition } = useCardTransition();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => Object.fromEntries(course.modules.map((courseModule) => [courseModule.id, true])));
  const totalMinutes = course.modules.reduce((total, courseModule) => total + courseModule.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.durationInMinutes, 0), 0);
  const durationLabel = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`;

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
        cover: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=90&w=1800&auto=format&fit=crop",
        category: LESSON_KIND[nextLesson.type] ?? "Aula",
        duration: `${nextLesson.durationInMinutes} min`,
        type: "lesson",
      },
      href: `/courses/${course.id}/lessons/${nextLesson.id}`,
    });
  };

  const handleLessonRowClick = (lesson: Lesson, e: React.MouseEvent<HTMLAnchorElement>) => {
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
        cover: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=90&w=1800&auto=format&fit=crop",
        category: LESSON_KIND[lesson.type] ?? "Aula",
        duration: `${lesson.durationInMinutes} min`,
        type: "lesson",
      },
      href: `/courses/${course.id}/lessons/${lesson.id}`,
    });
  };

  return (
    <div className="min-h-screen pt-19">
      <section className="editorial-container py-8 sm:py-12">
        <div className="relative isolate overflow-hidden rounded-2xl bg-foreground shadow-elev-4">
          <Image
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=90&w=1800&auto=format&fit=crop"
            alt="Grupo participando de uma dinâmica de aprendizagem"
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover opacity-55"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/20"
          />

          <div className="relative z-10 max-w-3xl px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
            <p className="eyebrow text-background/70">Comunicação · Curso essencial</p>
            <h1 className="display-1 mt-4 text-background">{course.title}</h1>
            <p className="lede mt-5 text-background/75">{course.description}</p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <span className="material-thin flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-background">
                <BookOpen className="size-4" aria-hidden="true" />
                <span data-numeric>{totalLessons} aulas</span>
              </span>
              <span className="material-thin flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-background">
                <Clock3 className="size-4" aria-hidden="true" />
                <span data-numeric>{durationLabel}</span>
              </span>
              <span className="material-thin flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-background">
                <Award className="size-4" aria-hidden="true" />
                Certificado incluso
              </span>
            </div>

            {nextLesson && (
              <Link
                href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                onClick={handleNextLessonClick}
                className={buttonVariants({ variant: "primary", size: "lg", className: "press mt-9 gap-2" })}
              >
                <Play className="size-4 fill-current" aria-hidden="true" />
                {completedLessons === 0 ? "Começar curso" : "Continuar próxima aula"}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="editorial-container grid gap-10 pb-24 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div>
          <Rise>
            <header className="mb-7">
              <p className="eyebrow">Plano do curso</p>
              <h2 className="display-2 mt-2 text-foreground">O que você vai praticar</h2>
            </header>
          </Rise>

          {course.modules.length === 0 ? (
            <EmptyState className="py-16">
              <span className="icon-draw mx-auto grid size-14 place-items-center rounded-2xl bg-background-secondary text-muted">
                <CourseIcon size={26} />
              </span>
              <p className="mt-5 font-display text-lg font-bold text-foreground">Conteúdo a caminho</p>
              <p className="mt-1.5 text-sm text-muted">Os módulos deste curso ainda estão sendo publicados.</p>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {course.modules.map((courseModule, moduleIndex) => (
                <Rise key={courseModule.id} delay={moduleIndex * 70}>
                  <Card className="gap-0 overflow-hidden p-0">
                    <Disclosure
                      isExpanded={expandedModules[courseModule.id]}
                      onExpandedChange={() => setExpandedModules((current) => ({ ...current, [courseModule.id]: !current[courseModule.id] }))}
                    >
                      <Disclosure.Heading level={3}>
                        <Disclosure.Trigger className="flex min-h-20 w-full items-center gap-4 p-5 text-left transition-colors duration-[var(--duration-md)] hover:bg-surface-secondary sm:p-6">
                          <span className="min-w-0 flex-1">
                            <span className="eyebrow block text-accent">Módulo {courseModule.order}</span>
                            <span className="mt-1 block font-display text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl">
                              {courseModule.title}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-muted" data-numeric>
                            {courseModule.lessons.length} aulas
                          </span>
                          <Disclosure.Indicator className="text-muted" />
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
                                className="group flex min-h-18 items-center gap-4 px-5 py-4 transition-colors duration-[var(--duration-md)] hover:bg-accent-soft/40 sm:px-6"
                              >
                                <span
                                  className={cn(
                                    "grid size-9 shrink-0 place-items-center rounded-lg transition-colors duration-[var(--duration-md)]",
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
                                      "block truncate text-sm font-bold",
                                      lesson.isCompleted ? "text-muted" : "text-foreground group-hover:text-accent",
                                    )}
                                  >
                                    <span data-numeric>{lessonIndex + 1}.</span> {lesson.title}
                                  </span>
                                  <span className="mt-1 block text-xs font-medium text-muted">
                                    {LESSON_KIND[lesson.type] ?? "Leitura"}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted" data-numeric>
                                  <Clock3 className="size-3.5" aria-hidden="true" />
                                  {lesson.durationInMinutes} min
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

        <aside className="lg:sticky lg:top-24">
          <Reveal edge className="rounded-2xl">
            <Card className="gap-0 p-0">
              <Card.Content className="gap-0 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">Seu progresso</p>
                    <p className="mt-2 font-display text-4xl font-extrabold tracking-[-0.045em] text-accent" data-numeric>
                      {progressPercentage}%
                    </p>
                  </div>
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Award className="size-6" aria-hidden="true" />
                  </span>
                </div>

                <ProgressBar value={progressPercentage} color="accent" size="md" className="mt-5" aria-label="Progresso no curso">
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
                <p className="mt-2 text-xs font-semibold text-muted" data-numeric>
                  {completedLessons} de {totalLessons} aulas concluídas
                </p>

                <Separator className="my-6" />

                <dl className="flex flex-col gap-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted">Tempo estimado</dt>
                    <dd className="font-bold text-foreground" data-numeric>{durationLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted">Certificado</dt>
                    <dd><Chip color="success" variant="soft" size="sm">Incluso</Chip></dd>
                  </div>
                </dl>

                {nextLesson && (
                  <Link
                    href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                    onClick={handleNextLessonClick}
                    className={buttonVariants({ variant: "primary", fullWidth: true, className: "mt-7 gap-2" })}
                  >
                    <Play className="size-4 fill-current" aria-hidden="true" />
                    Continuar curso
                  </Link>
                )}
              </Card.Content>
            </Card>
          </Reveal>
        </aside>
      </section>
    </div>
  );
}
