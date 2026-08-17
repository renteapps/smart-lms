"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Brain, CheckCircle2, FileText, Menu, PlayCircle } from "lucide-react";
import { Button, Disclosure, Drawer, ProgressBar, buttonVariants } from "@heroui/react";
import type { Course, Lesson } from "@/types/course";
import { useZenMode } from "@/contexts/ZenModeContext";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

/**
 * Índice do curso dentro da sala de aula.
 *
 * No desktop é uma coluna fixa; abaixo de `lg` vira `Drawer` — o mesmo conteúdo,
 * a mesma ordem de prioridade. O cabeçalho móvel é acrílico porque a aula rola
 * por baixo dele; a coluna do desktop é superfície opaca, já que nada passa atrás.
 */
export default function CourseSidebar({ course }: { course: Course }) {
  const params = useParams();
  const courseId = params.id as string;
  const currentLessonId = params.lessonId as string;
  const { isZenMode } = useZenMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => Object.fromEntries(course.modules.map((courseModule) => [courseModule.id, true])));

  const totalLessons = course.modules.reduce((total, courseModule) => total + courseModule.lessons.length, 0);
  const completedLessons = course.modules.reduce((total, courseModule) => total + courseModule.lessons.filter((lesson) => lesson.isCompleted).length, 0);
  const progressPercentage = Math.round((completedLessons / Math.max(totalLessons, 1)) * 100);

  const lessonIcon = (lesson: Lesson) => {
    if (lesson.isCompleted) return <CheckCircle2 className="size-4 text-success" aria-hidden="true" />;
    if (lesson.type === "profile_test") return <Brain className="size-4 text-accent" aria-hidden="true" />;
    if (lesson.type === "text") return <FileText className="size-4 text-muted" aria-hidden="true" />;
    return <PlayCircle className="size-4 text-muted" aria-hidden="true" />;
  };

  const sidebarContent = (
    <>
      <div className="border-b border-separator px-5 py-5">
        <Link
          href={`/courses/${courseId}`}
          onClick={() => setMobileOpen(false)}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 gap-2" })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao curso
        </Link>

        <h2 className="mt-4 font-display text-lg font-bold leading-snug tracking-[-0.02em] text-foreground">
          {course.title}
        </h2>

        <ProgressBar value={progressPercentage} color="accent" size="sm" className="mt-5" aria-label="Progresso no curso">
          <div className="flex items-center justify-between gap-3 text-xs font-bold">
            <span className="text-muted">Progresso</span>
            <ProgressBar.Output className="text-accent" />
          </div>
          <ProgressBar.Track className="mt-2">
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <p className="mt-2 text-xs font-medium text-muted" data-numeric>
          {completedLessons} de {totalLessons} aulas concluídas
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-1" aria-label="Conteúdo do curso">
        {course.modules.map((courseModule) => (
          <Disclosure
            key={courseModule.id}
            isExpanded={expandedModules[courseModule.id]}
            onExpandedChange={() => setExpandedModules((current) => ({ ...current, [courseModule.id]: !current[courseModule.id] }))}
            className="border-b border-separator last:border-0"
          >
            <Disclosure.Heading level={3}>
              <Disclosure.Trigger className="flex min-h-18 w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-[var(--duration-md)] hover:bg-surface-secondary">
                <span className="min-w-0 flex-1">
                  <span className="eyebrow block text-accent">Módulo {courseModule.order}</span>
                  <span className="mt-1 block text-sm font-bold text-foreground">{courseModule.title}</span>
                </span>
                <Disclosure.Indicator className="text-muted" />
              </Disclosure.Trigger>
            </Disclosure.Heading>

            <Disclosure.Content>
              <ul className="flex flex-col gap-0.5 px-2 pb-3">
                {courseModule.lessons.map((lesson) => {
                  const isActive = lesson.id === currentLessonId;
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/courses/${courseId}/lessons/${lesson.id}`}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "relative flex min-h-14 items-start gap-3 rounded-lg px-3 py-3 transition-colors duration-[var(--duration-md)]",
                          isActive
                            ? "bg-accent-soft text-accent-soft-foreground"
                            : "text-foreground hover:bg-surface-secondary",
                        )}
                      >
                        {isActive && (
                          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />
                        )}
                        <span className="mt-0.5 shrink-0">{lessonIcon(lesson)}</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm leading-5", isActive ? "font-bold" : "font-semibold")}>
                            {lesson.title}
                          </span>
                          <span className="mt-1 block text-xs font-medium text-muted" data-numeric>
                            {lesson.durationInMinutes} min
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Disclosure.Content>
          </Disclosure>
        ))}
      </nav>
    </>
  );

  if (isZenMode) return null;

  return (
    <>
      <header className="material fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-3 lg:hidden">
        <div className="relative z-10 flex items-center">
          <BrandMark compact />
        </div>
        <div className="relative z-10 min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold text-foreground">{course.title}</p>
          <p className="text-[0.6875rem] font-semibold text-muted" data-numeric>{progressPercentage}% concluído</p>
        </div>
        <Button
          isIconOnly
          variant="ghost"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir conteúdo do curso"
          className="relative z-10 shrink-0"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <Drawer.Root isOpen={mobileOpen} onOpenChange={setMobileOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="left" className="w-[min(90vw,22.5rem)]">
            <Drawer.Dialog aria-label="Conteúdo do curso" className="flex h-full flex-col gap-0 p-0">
              {sidebarContent}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer.Root>

      <aside className="hidden h-screen w-80 shrink-0 flex-col border-r border-separator bg-surface lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
