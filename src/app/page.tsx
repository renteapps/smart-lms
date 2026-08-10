import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Flame,
  Play,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import CourseCard from "@/components/CourseCard";
import LessonCard from "@/components/LessonCard";
import DailyPill from "@/components/DailyPill";
import CtaBand from "@/components/CtaBand";
import { HomeBlogSection } from "@/components/blog/HomeBlogSection";
import { getAllArticles } from "@/lib/blog";
import { CATALOG_COURSES, CONTINUE_LESSONS } from "@/lib/catalog";
import WeeklyTrailSection from "@/components/WeeklyTrailSection";

const week = [
  { day: "Seg", complete: true },
  { day: "Ter", complete: true },
  { day: "Qua", complete: true },
  { day: "Qui", complete: true },
  { day: "Sex", complete: false, current: true },
  { day: "Sáb", complete: false },
  { day: "Dom", complete: false },
];

export default function Home() {
  const articles = getAllArticles();
  const formattedDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());
  const today = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="overflow-hidden pt-[76px]">
      <section className="relative border-b border-border bg-[linear-gradient(180deg,var(--primary-pale)_0%,color-mix(in_srgb,var(--primary-pale)_38%,var(--bg))_100%)]">
        <div className="absolute -right-28 -top-24 h-80 w-80 rounded-full border-[62px] border-white/25" aria-hidden="true" />
        <div className="editorial-container relative py-8 sm:py-10 lg:py-12">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-primary-active">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Olá, Nohan. Bom ter você aqui.
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-ink sm:text-4xl">
                Qual habilidade vamos desenvolver hoje?
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-text-soft">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              {today}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
            <article className="group relative min-h-[390px] overflow-hidden rounded-[14px] bg-ink text-white shadow-[var(--shadow-float)] sm:min-h-[420px]">
              <Image
                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=90&w=1600&auto=format&fit=crop"
                alt="Equipe em uma conversa colaborativa"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 68vw"
                className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,.96)_0%,rgba(17,24,39,.82)_46%,rgba(17,24,39,.2)_100%)]" />
              <div className="relative flex min-h-[390px] max-w-[650px] flex-col justify-between p-6 sm:min-h-[420px] sm:p-9 lg:p-10">
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur-md">Continuar aprendendo</span>
                  <span className="text-xs font-semibold text-white/65">Comunicação · Módulo 1</span>
                </div>

                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/65">
                    <Clock3 className="h-4 w-4" aria-hidden="true" /> 12 min restantes
                  </p>
                  <h2 className="max-w-xl text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl">
                    Escuta ativa: o silêncio também comunica
                  </h2>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
                    Retome exatamente de onde parou e pratique uma comunicação mais consciente.
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-4">
                    <Link href="/courses/c1/lessons/l2" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-white px-5 font-bold text-ink shadow-lg hover:-translate-y-0.5 hover:bg-primary-pale">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-white"><Play className="ml-0.5 h-3.5 w-3.5 fill-current" /></span>
                      Retomar aula
                    </Link>
                    <div className="min-w-[190px] flex-1 sm:max-w-[250px]">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-white/75"><span>Seu progresso</span><span>68%</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/18"><div className="h-full w-[68%] rounded-full bg-white" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <aside className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1" aria-label="Resumo da sua aprendizagem">
              <div className="editorial-card flex flex-col justify-between p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Sua semana</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-ink">4 de 5 dias</h2>
                    <p className="mt-1 text-sm text-text-soft">Você está a um passo da meta.</p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-accent-orange/12 text-accent-orange"><Target className="h-5 w-5" /></span>
                </div>
                <div className="mt-7 grid grid-cols-7 gap-2">
                  {week.map((item) => (
                    <div key={item.day} className="text-center">
                      <span className={`mx-auto grid h-8 w-8 place-items-center rounded-[10px] border text-xs font-bold ${item.complete ? "border-primary bg-primary text-on-primary" : item.current ? "border-primary bg-primary-pale text-primary-active" : "border-border bg-canvas-soft text-text-mute"}`}>
                        {item.complete ? <Check className="h-3.5 w-3.5" /> : item.day.slice(0, 1)}
                      </span>
                      <span className="mt-1.5 block text-[10px] font-semibold text-text-mute">{item.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="editorial-card grid grid-cols-2 divide-x divide-border overflow-hidden">
                <div className="p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-orange/12 text-accent-orange"><Flame className="h-5 w-5" /></span>
                  <p className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-ink">7 dias</p>
                  <p className="mt-1 text-xs font-semibold text-text-mute">Sequência atual</p>
                </div>
                <div className="p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-sage/15 text-positive"><TrendingUp className="h-5 w-5" /></span>
                  <p className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-ink">6,2h</p>
                  <p className="mt-1 text-xs font-semibold text-text-mute">Tempo investido</p>
                </div>
              </div>

              <Link href="/minha-trilha" className="group flex min-h-16 items-center justify-between rounded-[14px] border border-primary/15 bg-primary px-5 font-bold text-on-primary shadow-lg shadow-primary/15 hover:bg-primary-active">
                <span className="flex items-center gap-3"><Route className="h-5 w-5" /> Ver plano completo</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="editorial-container py-8 sm:py-10">
        <DailyPill />
      </section>

      <WeeklyTrailSection />

      <section className="editorial-container py-10 sm:py-14">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Em andamento</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">Sua aprendizagem continua aqui</h2>
            <p className="mt-2 max-w-2xl text-base text-text-soft">Dois conteúdos curtos para manter seu ritmo sem sobrecarregar a agenda.</p>
          </div>
          <Link href="/minha-trilha" className="inline-flex items-center gap-2 text-sm font-bold text-primary-active hover:text-primary">Ver jornada completa <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {CONTINUE_LESSONS.map((lesson) => <LessonCard key={lesson.id} {...lesson} className="w-full min-h-[180px]" />)}
        </div>
      </section>

      <section className="border-y border-border bg-surface/55">
        <div className="editorial-container py-12 sm:py-16">
          <div className="mb-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="eyebrow">Recomendado para você</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">Aprenda com intenção</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-text-soft">Uma curadoria baseada nos seus objetivos de comunicação, liderança e impacto no trabalho.</p>
            </div>
            <Link href="/cursos" className="inline-flex min-h-11 items-center gap-2 rounded-[12px] border border-border bg-surface px-4 text-sm font-bold text-ink shadow-sm hover:border-primary/30 hover:text-primary-active">
              Explorar catálogo <BookOpen className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {CATALOG_COURSES.slice(0, 3).map((course) => <CourseCard key={course.id} {...course} />)}
          </div>
        </div>
      </section>

      <CtaBand />
      <HomeBlogSection articles={articles} />
    </div>
  );
}
