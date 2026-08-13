import Image from "next/image";
import Link from "next/link";
import { BookOpen, Check, Clock3, Flame, TrendingUp } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Card } from "@heroui/react/card";
import { Label } from "@heroui/react/label";
import { ProgressBar } from "@heroui/react/progress-bar";
import CourseCard from "@/components/CourseCard";
import LessonCard from "@/components/LessonCard";
import DailyPill from "@/components/DailyPill";
import CtaBand from "@/components/CtaBand";
import HeroBackdrop from "@/components/HeroBackdrop";
import { HomeBlogSection } from "@/components/blog/HomeBlogSection";
import { ArrowIcon, PlayIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { Rise } from "@/components/ui/Rise";
import { getAllArticles } from "@/lib/blog";
import { CATALOG_COURSES, CONTINUE_LESSONS } from "@/lib/catalog";
import TodayTrailSection from "@/components/TodayTrailSection";
import { cn } from "@/lib/utils";

/** Meta de dias de estudo por semana usada na régua do herói. */
const WEEKLY_GOAL_DAYS = 5;

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

  const [featuredLesson, ...otherLessons] = CONTINUE_LESSONS;
  const completedDays = week.filter((item) => item.complete).length;

  return (
    /*
     * `isolate` prende o `-z-10` do fundo do herói a esta árvore: a mancha
     * fica atrás de todo o conteúdo da home sem cair atrás do gradiente
     * ambiente do RouteShell.
     */
    <div className="relative isolate pt-[76px]">
      {/* ---------------------------------------------------------------
       * Herói
       *
       * Sem cartão: só tipografia, uma ação e uma régua de dados. A única
       * arte é a capa da aula em andamento, borrada ao fundo — ela dá
       * pertencimento à tela inicial sem competir com o bloco que realmente
       * importa, que é o "continuar aprendendo" logo abaixo.
       * ------------------------------------------------------------- */}
      <HeroBackdrop src={featuredLesson.cover} />

      <section className="editorial-container pb-[clamp(2.5rem,5vw,4rem)] pt-[clamp(3rem,7vw,6rem)]">
        <p className="eyebrow">Olá, Nohan · {today}</p>

        <h1 className="display-1 mt-5 max-w-3xl text-foreground">
          Qual habilidade vamos desenvolver hoje?
        </h1>

        <p className="lede mt-6">
          Sua trilha se ajusta ao seu ritmo. Escolha um passo pequeno, comece por ele — a organização
          do resto fica com a gente.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href={`/courses/c1/lessons/${featuredLesson.id}`}
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "icon-draw")}
          >
            <PlayIcon size={20} />
            Retomar aula
          </Link>
          <Link
            href="/minha-trilha"
            className={cn(buttonVariants({ variant: "tertiary", size: "lg" }), "icon-draw")}
          >
            Ver plano completo
            <ArrowIcon size={18} />
          </Link>
        </div>

        {/*
         * Régua de dados: três números que respondem "como estou indo?" sem
         * pedir três cartões. Hairline no topo, sem caixa.
         */}
        <dl className="mt-[clamp(3rem,6vw,4.5rem)] grid gap-8 border-t border-hairline pt-8 sm:grid-cols-3 sm:gap-10 sm:divide-x sm:divide-hairline">
          <div className="min-w-0">
            <dt className="eyebrow">Meta da semana</dt>
            <dd className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground">
              <span data-numeric>
                {completedDays} de {WEEKLY_GOAL_DAYS}
              </span>{" "}
              dias
            </dd>
            <ul className="mt-4 flex items-center gap-1.5" aria-label="Dias de estudo desta semana">
              {week.map((item) => (
                <li key={item.day}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-7 place-items-center rounded-md text-xs font-bold",
                      item.complete && "bg-accent text-accent-foreground",
                      !item.complete && item.current && "bg-accent-soft text-accent-soft-foreground",
                      !item.complete && !item.current && "bg-default text-muted",
                    )}
                  >
                    {item.complete ? <Check className="size-3.5" /> : item.day.slice(0, 1)}
                  </span>
                  <span className="sr-only">
                    {item.day}: {item.complete ? "concluído" : item.current ? "hoje" : "pendente"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 sm:pl-10">
            <dt className="eyebrow">Sequência atual</dt>
            <dd className="mt-2 flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-foreground">
              <Flame className="size-5 text-warning" aria-hidden="true" />
              <span data-numeric>7</span> dias
            </dd>
            <p className="mt-4 text-sm text-muted">Seu recorde continua de pé.</p>
          </div>

          <div className="min-w-0 sm:pl-10">
            <dt className="eyebrow">Tempo investido</dt>
            <dd className="mt-2 flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-foreground">
              <TrendingUp className="size-5 text-success" aria-hidden="true" />
              <span data-numeric>6,2h</span>
            </dd>
            <p className="mt-4 text-sm text-muted">Somadas nos últimos 30 dias.</p>
          </div>
        </dl>
      </section>

      {/* ---------------------------------------------------------------
       * Continuar aprendendo — o coração da tela
       * ------------------------------------------------------------- */}
      <section className="editorial-container section-rhythm">
        <Rise className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Em andamento</p>
            <h2 className="display-2 mt-3 text-foreground">Sua aprendizagem continua aqui</h2>
            <p className="lede mt-4">
              Dois conteúdos curtos para manter seu ritmo sem sobrecarregar a agenda.
            </p>
          </div>
          <Link
            href="/minha-trilha"
            className={cn(buttonVariants({ variant: "tertiary" }), "icon-draw shrink-0")}
          >
            Ver jornada completa
            <ArrowIcon size={16} />
          </Link>
        </Rise>

        <Rise className="mt-10 block">
          {/*
           * Único gesto expressivo da página: o realce de borda do Fluent
           * acompanhando o cursor. Fica reservado a este cartão porque é ele
           * que precisa ser encontrado primeiro.
           */}
          <Reveal edge className="icon-draw rounded-2xl">
            <Link
              href={`/courses/c1/lessons/${featuredLesson.id}`}
              className="group block rounded-2xl"
            >
              <Card className="gap-0 overflow-hidden p-0">
                <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
                  <div className="relative aspect-[16/10] overflow-hidden bg-background-secondary lg:aspect-auto lg:min-h-[23rem]">
                    <Image
                      src={featuredLesson.cover}
                      alt={`Capa da aula ${featuredLesson.title}`}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.03]"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent"
                    />
                    {/* O vidro aqui tem função: a capa continua visível através da etiqueta. */}
                    <span className="material-thin absolute left-5 top-5 rounded-full px-3 py-1.5 text-xs font-bold text-white">
                      Continuar aprendendo
                    </span>
                    <span className="absolute bottom-5 left-5 flex items-center gap-1.5 text-xs font-bold text-white">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      {featuredLesson.duration} restantes
                    </span>
                  </div>

                  <Card.Content className="flex flex-col justify-between gap-8 p-7 sm:p-10">
                    <div>
                      <p className="eyebrow">{featuredLesson.moduleName}</p>
                      <h3 className="display-3 mt-3 text-foreground">{featuredLesson.title}</h3>
                      <p className="mt-4 max-w-md text-base leading-7 text-muted">
                        Retome exatamente de onde parou e pratique uma comunicação mais consciente.
                      </p>
                    </div>

                    <div className="flex flex-col gap-6">
                      <ProgressBar value={featuredLesson.progress} color="accent" size="md">
                        <Label className="text-xs font-bold text-muted">Seu progresso</Label>
                        <ProgressBar.Output className="text-xs font-bold text-accent" />
                        <ProgressBar.Track>
                          <ProgressBar.Fill />
                        </ProgressBar.Track>
                      </ProgressBar>

                      <div className="flex items-center justify-between gap-4 border-t border-hairline pt-6 text-sm font-bold text-accent">
                        <span>Retomar de onde parei</span>
                        <span
                          aria-hidden="true"
                          className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground transition-[background-color,color,transform] duration-[var(--duration-md)] group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-accent-foreground"
                        >
                          <ArrowIcon size={18} />
                        </span>
                      </div>
                    </div>
                  </Card.Content>
                </div>
              </Card>
            </Link>
          </Reveal>
        </Rise>

        {otherLessons.length > 0 && (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {otherLessons.map((lesson, index) => (
              <Rise key={lesson.id} delay={index * 80}>
                <LessonCard {...lesson} className="min-h-[168px] w-full" />
              </Rise>
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------------------------------- */}
      <section className="editorial-container pb-[clamp(2rem,4vw,3rem)]">
        <Rise>
          <DailyPill />
        </Rise>
      </section>

      <TodayTrailSection />

      {/* ---------------------------------------------------------------
       * Recomendado
       * ------------------------------------------------------------- */}
      <section className="editorial-container section-rhythm">
        <Rise className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Recomendado para você</p>
            <h2 className="display-2 mt-3 text-foreground">Aprenda com intenção</h2>
            <p className="lede mt-4">
              Uma curadoria baseada nos seus objetivos de comunicação, liderança e impacto no
              trabalho.
            </p>
          </div>
          <Link
            href="/cursos"
            className={cn(buttonVariants({ variant: "outline" }), "icon-rotate shrink-0")}
          >
            Explorar catálogo
            <BookOpen className="size-4" aria-hidden="true" />
          </Link>
        </Rise>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {CATALOG_COURSES.slice(0, 3).map((course, index) => (
            <Rise key={course.id} delay={index * 90} className="h-full">
              <CourseCard {...course} className="h-full" />
            </Rise>
          ))}
        </div>
      </section>

      <CtaBand />
      <HomeBlogSection articles={articles} />
    </div>
  );
}
