"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Route } from "lucide-react";
import LessonCard from "@/components/LessonCard";
import {
  createDemoTrail,
  getDurationInMinutes,
  getTrailForWeek,
  getWeekBounds,
  normalizeSavedTrail,
  type UserTrailContent,
} from "@/lib/userTrail";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const dayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit" });

export default function WeeklyTrailSection() {
  const [trail, setTrail] = useState<UserTrailContent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem("minha_trilha");
      let nextTrail = createDemoTrail();

      if (saved) {
        try {
          const normalized = normalizeSavedTrail(saved);
          if (normalized.length > 0) nextTrail = normalized;
        } catch {
          // Mantém a trilha de demonstração quando o dado local é inválido.
        }
      }

      setTrail(nextTrail);
      setIsLoaded(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const weeklyItems = useMemo(() => getTrailForWeek(trail), [trail]);
  const totalMinutes = weeklyItems.reduce((total, item) => total + getDurationInMinutes(item.duration), 0);
  const availableItems = weeklyItems.filter((item) => !item.locked).length;
  const { start, end } = getWeekBounds();
  const lastDay = new Date(end);
  lastDay.setDate(lastDay.getDate() - 1);
  const weekLabel = `${dateFormatter.format(start)} — ${dateFormatter.format(lastDay)}`;

  if (!isLoaded) {
    return (
      <section className="editorial-container py-10 sm:py-14" aria-label="Carregando conteúdos da trilha desta semana">
        <div className="h-72 animate-pulse rounded-[14px] border border-border bg-canvas-soft" />
      </section>
    );
  }

  return (
    <section className="border-y border-border bg-surface/55">
      <div className="editorial-container py-10 sm:py-14">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Sua trilha · {weekLabel}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">Conteúdos desta semana</h2>
            <p className="mt-2 max-w-2xl text-base text-text-soft">Seu plano personalizado reunido em um só lugar para você organizar o ritmo da semana.</p>
          </div>
          <Link href="/minha-trilha" className="inline-flex items-center gap-2 text-sm font-bold text-primary-active hover:text-primary">
            Ver trilha completa <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {weeklyItems.length > 0 ? (
          <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="flex flex-col justify-between rounded-[14px] bg-ink p-5 text-white sm:flex-row sm:items-center xl:min-h-[190px] xl:flex-col xl:items-start" aria-label="Resumo da semana">
              <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-white/10 text-white">
                <Route className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="mt-6 sm:mt-0 xl:mt-8">
                <p className="font-display text-3xl font-extrabold tracking-[-0.04em]">{weeklyItems.length} {weeklyItems.length === 1 ? "conteúdo" : "conteúdos"}</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/65"><Clock3 className="h-4 w-4" /> {totalMinutes} min planejados</p>
                <p className="mt-1 text-xs font-semibold text-white/50">{availableItems} {availableItems === 1 ? "disponível" : "disponíveis"} agora</p>
              </div>
            </aside>

            <div className="grid gap-5 md:grid-cols-2">
              {weeklyItems.map((item, index) => {
                const scheduledDate = new Date(item.scheduledDate!);
                return (
                  <article key={`${item.lessonId}-${item.scheduledDate}-${index}`} className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold capitalize text-text-mute">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      {dayFormatter.format(scheduledDate).replace(".", "")}
                    </div>
                    <LessonCard
                      {...item}
                      duration={item.duration || "10 min"}
                      href={item.locked ? undefined : `/courses/${item.courseId}/lessons/${item.lessonId}`}
                      className="min-h-[168px] w-full"
                    />
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="editorial-card flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="font-display text-xl font-extrabold text-ink">Sua semana ainda está livre.</p>
              <p className="mt-1 text-sm text-text-soft">Ajuste seus objetivos para receber uma nova seleção de conteúdos.</p>
            </div>
            <Link href="/onboarding" className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-bold text-on-primary hover:bg-primary-active">
              Montar minha trilha <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
