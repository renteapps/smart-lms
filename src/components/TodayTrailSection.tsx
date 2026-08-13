"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock3, Lock } from "lucide-react";
import { buttonVariants, Card, Chip, EmptyState, Skeleton } from "@heroui/react";
import { ArrowIcon, PlayIcon, TrailIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { Rise } from "@/components/ui/Rise";
import {
  createDemoTrail,
  getFocusDay,
  normalizeSavedTrail,
  type TrailFocusDay,
  type UserTrailContent,
} from "@/lib/userTrail";
import { cn } from "@/lib/utils";

const longDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function describeDay(focus: TrailFocusDay) {
  if (focus.offsetInDays === 0) return { label: "Hoje", title: "O que você tem para hoje" };
  if (focus.offsetInDays === 1) return { label: "Amanhã", title: "Sua próxima sessão é amanhã" };
  return { label: longDayFormatter.format(focus.date), title: "Sua próxima sessão" };
}

function lessonHref(item: UserTrailContent) {
  return `/courses/${item.courseId}/lessons/${item.lessonId}`;
}

export default function TodayTrailSection() {
  const [trail, setTrail] = useState<UserTrailContent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  /*
   * Lê direto no efeito, sem requestAnimationFrame: rAF não dispara em aba
   * oculta, e a página abriria com o esqueleto travado até receber foco.
   * Ler uma chave do localStorage não custa frame para justificar o adiamento.
   */
  useEffect(() => {
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
  }, []);

  const focus = useMemo(() => getFocusDay(trail), [trail]);

  if (!isLoaded) {
    return (
      <section
        className="border-y border-hairline bg-surface-secondary"
        aria-label="Carregando os conteúdos do seu dia"
      >
        <div className="editorial-container section-rhythm">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-32 rounded-md" />
            <Skeleton className="h-10 w-96 max-w-full rounded-lg" />
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <Skeleton className="h-72 rounded-2xl" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!focus) {
    return (
      <section className="border-y border-hairline bg-surface-secondary">
        <div className="editorial-container section-rhythm">
          <EmptyState className="items-center gap-5 py-14">
            <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <TrailIcon size={28} />
            </span>
            <div className="text-center">
              <p className="display-3 text-foreground">Nenhuma sessão agendada.</p>
              <p className="mt-2 text-sm text-muted">
                Monte sua trilha para receber conteúdos distribuídos na sua rotina.
              </p>
            </div>
            <Link href="/onboarding" className={cn(buttonVariants({ variant: "primary" }), "icon-draw")}>
              Montar minha trilha
              <ArrowIcon size={16} />
            </Link>
          </EmptyState>
        </div>
      </section>
    );
  }

  const { label, title } = describeDay(focus);
  /*
   * O destaque é o primeiro conteúdo liberado do dia — é a ação que a pessoa
   * consegue executar agora. Se tudo estiver bloqueado, cai no primeiro item
   * mesmo assim, para o dia não aparecer vazio sem explicação.
   */
  const featured = focus.items.find((item) => !item.locked) ?? focus.items[0];
  const rest = focus.items.filter((item) => item !== featured);
  const finishesAt =
    focus.offsetInDays === 0 ? new Date(Date.now() + focus.totalMinutes * 60_000) : null;

  return (
    <section className="border-y border-hairline bg-surface-secondary">
      <div className="editorial-container section-rhythm">
        <Rise className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <span className="inline-flex size-1.5 rounded-full bg-accent" aria-hidden="true" />
              {label}
            </p>
            <h2 className="display-2 mt-3 text-foreground">{title}</h2>
            <p className="lede mt-4">
              <span data-numeric>{focus.items.length}</span>{" "}
              {focus.items.length === 1 ? "conteúdo" : "conteúdos"} ·{" "}
              <span data-numeric>{focus.totalMinutes}</span> min
              {finishesAt && <> · você termina por volta das {timeFormatter.format(finishesAt)}</>}
            </p>
          </div>
          <Link
            href="/minha-trilha"
            className={cn(buttonVariants({ variant: "tertiary" }), "icon-draw shrink-0")}
          >
            Ver trilha completa
            <ArrowIcon size={16} />
          </Link>
        </Rise>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <Rise>
            <Reveal edge className="rounded-2xl">
              <Card className="lift icon-draw h-full gap-0 overflow-hidden p-0">
                <div className="grid sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                  <div className="relative aspect-[16/10] overflow-hidden bg-background-secondary sm:aspect-auto sm:h-full">
                    <Image
                      src={featured.cover}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 15rem"
                      className="object-cover"
                    />
                    {/* Material fino: a capa continua visível através da etiqueta. */}
                    <span className="material-thin absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white">
                      Comece por aqui
                    </span>
                  </div>

                  <div className="flex flex-col gap-5 p-6 sm:p-7">
                    <div>
                      {featured.moduleName && (
                        <p className="text-xs font-semibold text-muted">{featured.moduleName}</p>
                      )}
                      <h3 className="display-3 mt-2 text-foreground">{featured.title}</h3>
                      {featured.reason && (
                        <p className="mt-3 text-sm leading-6 text-muted">{featured.reason}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Chip color="default" variant="soft" size="sm">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        <span data-numeric>{featured.duration ?? "10 min"}</span>
                      </Chip>
                      {featured.locked && (
                        <Chip color="warning" variant="soft" size="sm">
                          <Lock className="size-3.5" aria-hidden="true" />
                          Bloqueado
                        </Chip>
                      )}
                    </div>

                    <div className="mt-auto pt-1">
                      {featured.locked ? (
                        <p className="text-sm text-muted">
                          Conclua o conteúdo anterior da trilha para liberar esta aula.
                        </p>
                      ) : (
                        <Link
                          href={lessonHref(featured)}
                          className={cn(buttonVariants({ variant: "primary" }), "w-full sm:w-auto")}
                        >
                          <PlayIcon size={18} />
                          {featured.progress ? "Continuar aula" : "Começar agora"}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>
          </Rise>

          {/*
           * Os demais conteúdos entram como linhas compactas, não como cards:
           * dois cards do mesmo peso competiriam com o destaque e desfariam a
           * hierarquia que a seção existe para criar.
           */}
          {rest.length > 0 && (
            <Rise delay={80}>
              <div className="flex flex-col gap-3">
                <p className="eyebrow">Depois disso</p>
                <ul className="flex flex-col gap-3">
                  {rest.map((item) => {
                    const row = (
                      <>
                        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                          <Image src={item.cover} alt="" fill sizes="3.5rem" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {item.title}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                            {item.locked ? (
                              <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
                            )}
                            <span data-numeric>{item.locked ? "Bloqueado" : item.duration ?? "10 min"}</span>
                          </span>
                        </span>
                        {!item.locked && (
                          <span className="shrink-0 text-muted" aria-hidden="true">
                            <ArrowIcon size={16} />
                          </span>
                        )}
                      </>
                    );

                    return (
                      <li key={`${item.courseId}-${item.lessonId}`}>
                        {item.locked ? (
                          <div className="flex items-center gap-4 rounded-xl border border-hairline bg-surface p-3 opacity-70">
                            {row}
                          </div>
                        ) : (
                          <Link
                            href={lessonHref(item)}
                            className="icon-spring icon-draw flex items-center gap-4 rounded-xl border border-hairline bg-surface p-3 shadow-elev-1 transition-[box-shadow,border-color,transform] duration-[var(--duration-md)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-elev-2"
                          >
                            {row}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Rise>
          )}
        </div>
      </div>
    </section>
  );
}
