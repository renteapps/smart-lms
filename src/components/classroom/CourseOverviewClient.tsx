"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Award, BookOpen, CheckCircle2, ChevronDown, Clock3, FileText, Play, PlayCircle, Brain } from "lucide-react";
import type { Course, Lesson } from "@/lib/mockData";
import { cn } from "@/lib/utils";

type CourseOverviewClientProps = {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  nextLesson: Lesson | null;
};

export default function CourseOverviewClient({ course, totalLessons, completedLessons, progressPercentage, nextLesson }: CourseOverviewClientProps) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => Object.fromEntries(course.modules.map((courseModule) => [courseModule.id, true])));
  const totalMinutes = course.modules.reduce((total, courseModule) => total + courseModule.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.durationInMinutes, 0), 0);

  return (
    <div className="min-h-screen pt-[76px]">
      <section className="editorial-container py-8 sm:py-10">
        <div className="relative overflow-hidden rounded-[14px] bg-ink text-white shadow-[0_28px_80px_rgb(23,32,51,0.18)]">
          <Image src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=90&w=1800&auto=format&fit=crop" alt="Grupo participando de uma dinâmica de aprendizagem" fill priority sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/92 to-ink/15" />
          <div className="relative z-10 max-w-3xl px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Comunicação · Curso essencial</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.03] tracking-[-0.055em] sm:text-6xl">{course.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{course.description}</p>
            <div className="mt-7 flex flex-wrap gap-5 text-sm font-semibold text-white/75">
              <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> {totalLessons} aulas</span>
              <span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min</span>
              <span className="flex items-center gap-2"><Award className="h-4 w-4" /> Certificado incluso</span>
            </div>
            {nextLesson && (
              <Link href={`/courses/${course.id}/lessons/${nextLesson.id}`} className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-[13px] bg-primary px-6 font-bold text-on-primary shadow-lg hover:bg-[#4268c8] hover:-translate-y-0.5">
                <Play className="h-4 w-4 fill-current" /> {completedLessons === 0 ? "Começar curso" : "Continuar próxima aula"}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="editorial-container grid gap-8 pb-20 pt-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div>
          <div className="mb-6">
            <p className="eyebrow">Plano do curso</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink">O que você vai praticar</h2>
          </div>
          <div className="space-y-4">
            {course.modules.map((courseModule) => {
              const isExpanded = expandedModules[courseModule.id];
              return (
                <article key={courseModule.id} className="editorial-card overflow-hidden">
                  <button onClick={() => setExpandedModules((current) => ({ ...current, [courseModule.id]: !current[courseModule.id] }))} aria-expanded={isExpanded} className="flex min-h-20 w-full items-center justify-between gap-4 p-5 text-left hover:bg-surface-hover sm:p-6">
                    <div><span className="text-xs font-bold uppercase tracking-[0.1em] text-primary-active">Módulo {courseModule.order}</span><h3 className="mt-1 text-lg font-extrabold text-ink sm:text-xl">{courseModule.title}</h3></div>
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-canvas-soft text-text-soft transition-transform", isExpanded && "rotate-180")}><ChevronDown className="h-5 w-5" /></span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border">
                      {courseModule.lessons.map((lesson, lessonIndex) => (
                        <Link key={lesson.id} href={`/courses/${course.id}/lessons/${lesson.id}`} className="group flex min-h-18 items-center gap-4 border-b border-border/70 px-5 py-4 last:border-b-0 hover:bg-primary-pale/35 sm:px-6">
                          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[11px]", lesson.isCompleted ? "bg-positive/10 text-positive" : lesson.type === "profile_test" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-canvas-soft text-text-mute group-hover:bg-primary-pale group-hover:text-primary")}>
                            {lesson.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : lesson.type === "profile_test" ? <Brain className="h-4 w-4" /> : lesson.type === "video" ? <PlayCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1"><p className={cn("truncate text-sm font-bold", lesson.isCompleted ? "text-text-soft" : "text-ink group-hover:text-primary-active")}>{lessonIndex + 1}. {lesson.title}</p><p className="mt-1 text-xs font-medium text-text-mute">{lesson.type === "profile_test" ? "Teste de Perfil" : lesson.type === "video" ? "Vídeo" : "Leitura"}</p></div>
                          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-text-mute"><Clock3 className="h-3.5 w-3.5" /> {lesson.durationInMinutes} min</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <aside className="editorial-card p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-text-soft">Seu progresso</p><p className="mt-2 font-display text-4xl font-extrabold tracking-[-0.05em] text-primary-active">{progressPercentage}%</p></div><span className="grid h-12 w-12 place-items-center rounded-[15px] bg-primary-pale text-primary"><Award className="h-6 w-6" /></span></div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-canvas-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${progressPercentage}%` }} /></div>
          <p className="mt-2 text-xs font-semibold text-text-mute">{completedLessons} de {totalLessons} aulas concluídas</p>
          <div className="my-6 h-px bg-border" />
          <div className="space-y-4 text-sm"><div className="flex items-center justify-between"><span className="text-text-soft">Tempo estimado</span><strong className="text-ink">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min</strong></div><div className="flex items-center justify-between"><span className="text-text-soft">Certificado</span><strong className="text-positive">Incluso</strong></div></div>
          {nextLesson && <Link href={`/courses/${course.id}/lessons/${nextLesson.id}`} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-[13px] bg-primary font-bold text-on-primary hover:bg-primary-active"><Play className="h-4 w-4 fill-current" /> Continuar curso</Link>}
        </aside>
      </section>
    </div>
  );
}
