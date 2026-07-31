"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, FileText, Menu, PlayCircle, Brain } from "lucide-react";
import { MOCK_COURSE, type Lesson } from "@/lib/mockData";
import { useZenMode } from "@/contexts/ZenModeContext";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

export default function CourseSidebar() {
  const params = useParams();
  const courseId = params.id as string;
  const currentLessonId = params.lessonId as string;
  const course = MOCK_COURSE;
  const { isZenMode } = useZenMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => Object.fromEntries(course.modules.map((courseModule) => [courseModule.id, true])));

  const totalLessons = course.modules.reduce((total, courseModule) => total + courseModule.lessons.length, 0);
  const completedLessons = course.modules.reduce((total, courseModule) => total + courseModule.lessons.filter((lesson) => lesson.isCompleted).length, 0);
  const progressPercentage = Math.round((completedLessons / Math.max(totalLessons, 1)) * 100);

  const lessonIcon = (lesson: Lesson) => {
    if (lesson.isCompleted) return <CheckCircle2 className="h-4 w-4 text-positive" />;
    if (lesson.type === "profile_test") return <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    if (lesson.type === "text") return <FileText className="h-4 w-4 text-text-mute" />;
    return <PlayCircle className="h-4 w-4 text-text-mute" />;
  };

  const sidebarContent = (
    <>
      <div className="border-b border-border p-5">
        <Link href={`/courses/${courseId}`} onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] pr-3 text-sm font-bold text-text-soft hover:text-primary-active">
          <ArrowLeft className="h-4 w-4" /> Voltar ao curso
        </Link>
        <h2 className="mt-4 text-lg font-extrabold leading-snug text-ink">{course.title}</h2>
        <div className="mt-5 flex items-center justify-between text-xs font-bold"><span className="text-text-mute">Progresso</span><span className="text-primary-active">{progressPercentage}%</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${progressPercentage}%` }} /></div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Conteúdo do curso">
        {course.modules.map((courseModule) => {
          const isExpanded = expandedModules[courseModule.id];
          return (
            <section key={courseModule.id} className="border-b border-border/80 last:border-0">
              <button onClick={() => setExpandedModules((current) => ({ ...current, [courseModule.id]: !current[courseModule.id] }))} aria-expanded={isExpanded} className="flex min-h-18 w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-hover">
                <div><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary-active">Módulo {courseModule.order}</span><h3 className="mt-1 text-sm font-bold text-ink">{courseModule.title}</h3></div>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-mute transition-transform", isExpanded && "rotate-180")} />
              </button>
              {isExpanded && (
                <div className="pb-2">
                  {courseModule.lessons.map((lesson) => {
                    const isActive = lesson.id === currentLessonId;
                    return (
                      <Link key={lesson.id} href={`/courses/${courseId}/lessons/${lesson.id}`} onClick={() => setMobileOpen(false)} aria-current={isActive ? "page" : undefined} className={cn("mx-2 flex min-h-14 items-start gap-3 rounded-[10px] px-3 py-3", isActive ? "bg-primary-pale text-primary-active" : "text-ink hover:bg-surface-hover")}>
                        <span className="mt-0.5">{lessonIcon(lesson)}</span>
                        <div className="min-w-0 flex-1"><p className={cn("text-sm leading-5", isActive ? "font-bold" : "font-semibold")}>{lesson.title}</p><p className="mt-1 text-xs font-medium text-text-mute">{lesson.durationInMinutes} min</p></div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>
    </>
  );

  if (isZenMode) return null;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface/96 px-4 backdrop-blur-xl lg:hidden">
        <BrandMark compact />
        <div className="min-w-0 px-3 text-center"><p className="truncate text-sm font-bold text-ink">{course.title}</p><p className="text-[10px] font-semibold text-text-mute">{progressPercentage}% concluído</p></div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<button aria-label="Abrir conteúdo do curso" className="grid h-11 w-11 place-items-center rounded-[12px] bg-canvas-soft text-ink" />}><Menu className="h-5 w-5" /></SheetTrigger>
          <SheetContent side="left" className="w-[min(90vw,360px)] border-r border-border bg-surface p-0" showCloseButton>
            <SheetTitle className="sr-only">Conteúdo do curso</SheetTitle>
            <SheetDescription className="sr-only">Navegue pelos módulos e aulas.</SheetDescription>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </header>

      <aside className="hidden h-screen w-[320px] shrink-0 flex-col border-r border-border bg-surface lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
