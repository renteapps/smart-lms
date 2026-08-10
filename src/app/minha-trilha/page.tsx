"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, LayoutList, Lock, Play, Route, Sparkles, Target } from "lucide-react";
import LessonCard from "@/components/LessonCard";
import { useNotifications } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { createDemoTrail, normalizeSavedTrail, type UserTrailContent } from "@/lib/userTrail";

export default function MinhaTrilhaPage() {
  const [trilha, setTrilha] = useState<UserTrailContent[]>(() => createDemoTrail());
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const { addNotification } = useNotifications();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem("minha_trilha");
      if (saved) {
        try {
          const normalized = normalizeSavedTrail(saved);
          if (normalized.length > 0) setTrilha(normalized);
        } catch {
          // Mantém a trilha de demonstração quando o dado local é inválido.
        }
      }
      setIsLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const today = new Date().toLocaleDateString("pt-BR");
    const lastNotified = localStorage.getItem("@smartlms:last_trilha_notif");
    if (lastNotified === today) return;

    const releasedToday = trilha.filter((item) => item.scheduledDate && !item.locked && new Date(item.scheduledDate).toLocaleDateString("pt-BR") === today);
    if (releasedToday.length > 0) {
      addNotification({ title: "Sua prática de hoje está pronta", message: `Você tem ${releasedToday.length} aula(s) disponível(is) para continuar sua jornada.`, targetAudience: "all", channels: ["platform"] });
      localStorage.setItem("@smartlms:last_trilha_notif", today);
    }
  }, [addNotification, isLoaded, trilha]);

  const groupedByDate = useMemo(() => trilha.reduce<Record<string, UserTrailContent[]>>((groups, item) => {
    const label = item.scheduledDate
      ? new Date(item.scheduledDate).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
      : "Sem data";
    groups[label] = [...(groups[label] || []), item];
    return groups;
  }, {}), [trilha]);

  const released = trilha.filter((item) => !item.locked).length;
  const todayLabel = new Date().toLocaleDateString("pt-BR");
  const todayItems = trilha.filter((item) => item.scheduledDate && new Date(item.scheduledDate).toLocaleDateString("pt-BR") === todayLabel && !item.locked);
  const completion = Math.round((released / Math.max(trilha.length, 1)) * 100);

  return (
    <div className="pt-[76px]">
      <section className="border-b border-border bg-primary-pale/35">
        <div className="editorial-container py-9 sm:py-14">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface px-3 py-1.5 text-xs font-bold text-primary-active shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> Curadoria personalizada
              </div>
              <h1 className="max-w-3xl text-[2rem] font-extrabold leading-[1.04] tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl">Uma jornada clara para o seu próximo passo.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-text-soft sm:text-lg sm:leading-8">Sua trilha combina prática, reflexão e ritmo. Você não precisa fazer tudo hoje — apenas continuar.</p>
            </div>
            <Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center rounded-[12px] border border-border bg-surface px-4 text-sm font-bold text-ink shadow-sm hover:border-primary/30 hover:text-primary-active">Ajustar meus objetivos</Link>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2.5 sm:mt-9 sm:gap-4">
            <div className="editorial-card flex min-w-0 flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-primary-pale text-primary sm:h-11 sm:w-11 sm:rounded-[14px]"><Route className="h-4 w-4 sm:h-5 sm:w-5" /></span><div className="min-w-0"><p className="text-[10px] font-semibold leading-tight text-text-mute sm:text-xs">Progresso da etapa</p><p className="font-display text-xl font-extrabold text-ink sm:text-2xl">{completion}%</p></div></div>
            <div className="editorial-card flex min-w-0 flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent-sage/15 text-positive sm:h-11 sm:w-11 sm:rounded-[14px]"><CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /></span><div className="min-w-0"><p className="text-[10px] font-semibold leading-tight text-text-mute sm:text-xs">Aulas liberadas</p><p className="font-display text-xl font-extrabold text-ink sm:text-2xl">{released}</p></div></div>
            <div className="editorial-card flex min-w-0 flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent-orange/12 text-accent-orange sm:h-11 sm:w-11 sm:rounded-[14px]"><Target className="h-4 w-4 sm:h-5 sm:w-5" /></span><div className="min-w-0"><p className="text-[10px] font-semibold leading-tight text-text-mute sm:text-xs">Foco da semana</p><p className="truncate font-display text-sm font-extrabold text-ink sm:text-lg">Liderança</p></div></div>
          </div>
        </div>
      </section>

      <div className="editorial-container py-10 sm:py-14">
        {todayItems.length > 0 && (
          <section className="mb-12 overflow-hidden rounded-[14px] bg-ink text-white shadow-[var(--shadow-card)]">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Seu foco agora</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">Hoje é dia de praticar.</h2>
                <p className="mt-3 text-sm leading-6 text-white/70">Reserve cerca de 30 minutos para avançar nas aulas selecionadas para você.</p>
                <div className="mt-5 flex items-center gap-2 text-sm font-bold text-white/85"><Clock3 className="h-4 w-4" /> {todayItems.reduce((total, item) => total + Number.parseInt(item.duration || "0", 10), 0)} minutos planejados</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {todayItems.slice(0, 2).map((item) => <LessonCard key={item.lessonId} {...item} duration={item.duration || "10 min"} href={`/courses/${item.courseId}/lessons/${item.lessonId}`} className="w-full border-white/10" />)}
              </div>
            </div>
          </section>
        )}

        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Plano de aprendizagem</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink">Próximos passos</h2></div>
          <div className="flex w-fit items-center rounded-[13px] border border-border bg-surface p-1 shadow-sm">
            <button onClick={() => setViewMode("timeline")} className={cn("flex min-h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-bold", viewMode === "timeline" ? "bg-primary text-on-primary" : "text-text-soft hover:text-ink")}><LayoutList className="h-4 w-4" /> Trilha</button>
            <button onClick={() => setViewMode("calendar")} className={cn("flex min-h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-bold", viewMode === "calendar" ? "bg-primary text-on-primary" : "text-text-soft hover:text-ink")}><CalendarDays className="h-4 w-4" /> Agenda</button>
          </div>
        </div>

        {viewMode === "timeline" ? (
          <div className="relative space-y-5 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-border sm:before:left-6">
            {trilha.map((item, index) => (
              <article key={`${item.lessonId}-${index}`} className="relative grid gap-4 pl-14 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:pl-18">
                <span className={cn("absolute left-0 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border-4 border-bg text-xs font-extrabold sm:h-12 sm:w-12", item.locked ? "bg-canvas-soft text-text-mute" : "bg-primary text-on-primary")}>
                  {item.locked ? <Lock className="h-4 w-4" /> : index + 1}
                </span>
                <LessonCard {...item} duration={item.duration || "10 min"} href={item.locked ? undefined : `/courses/${item.courseId}/lessons/${item.lessonId}`} className="w-full min-h-[156px] sm:max-w-xl" />
                <div className="hidden min-w-32 text-right lg:block">
                  <p className="text-xs font-bold uppercase tracking-[0.09em] text-text-mute">{item.locked ? "Em breve" : index === 0 ? "Próxima aula" : "Liberada"}</p>
                  {!item.locked && index === 0 && <Link href={`/courses/${item.courseId}/lessons/${item.lessonId}`} className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary-active"><Play className="h-3.5 w-3.5 fill-current" /> Começar</Link>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedByDate).map(([dateLabel, items]) => (
              <section key={dateLabel}>
                <div className="mb-5 flex items-center gap-4"><CalendarDays className="h-5 w-5 text-primary" /><h3 className="text-lg font-extrabold capitalize text-ink">{dateLabel}</h3><span className="h-px flex-1 bg-border" /></div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => <LessonCard key={item.lessonId} {...item} duration={item.duration || "10 min"} href={item.locked ? undefined : `/courses/${item.courseId}/lessons/${item.lessonId}`} className="w-full min-h-[170px]" />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
