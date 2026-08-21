"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Chip } from "@heroui/react/chip";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { contentHref, type HomeSession } from "@/lib/studentHome";
import { cn } from "@/lib/utils";

const longDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

type DayCompleteHeroProps = {
  greeting: string;
  /** Sessão concluída hoje. Ausente quando a trilha acabou. */
  session: HomeSession | null;
  /** Próxima sessão com pendências, se houver. */
  next: HomeSession | null;
};

/**
 * Fim do dia — e fim da trilha.
 *
 * Quem terminou o dia precisa ver que terminou. Empurrar a sessão de quarta na
 * cara de quem acabou de fechar a de segunda transforma um produto de rotina num
 * produto de cobrança. A próxima sessão aparece como informação, não como ação.
 */
export default function DayCompleteHero({ greeting, session, next }: DayCompleteHeroProps) {
  const finished = session !== null;

  return (
    <section className="editorial-container pb-[clamp(2.5rem,5vw,4rem)] pt-[clamp(3rem,7vw,6rem)]">
      <p className="eyebrow">{greeting}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Chip color="success" variant="soft" size="sm">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          {finished ? "Dia concluído" : "Trilha em dia"}
        </Chip>
      </div>

      <h1 className="display-1 mt-5 max-w-3xl text-foreground">
        {finished ? "Você fechou o dia." : "Nada pendente por aqui."}
      </h1>

      <p className="lede mt-6">
        {finished && session ? (
          <>
            <span data-numeric>{session.done.length}</span>{" "}
            {session.done.length === 1 ? "conteúdo concluído" : "conteúdos concluídos"} ·{" "}
            <span data-numeric>{session.totalMinutes} min</span> de estudo. O resto da trilha
            continua organizado para os próximos dias.
          </>
        ) : (
          "Você concluiu tudo que estava agendado. Responda o questionário de novo para receber uma nova leva de conteúdos, ou explore o catálogo por conta própria."
        )}
      </p>

      {next ? (
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href={next.nextStep ? contentHref(next.nextStep) : "/minha-trilha"}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "icon-draw")}
          >
            Adiantar a próxima sessão
            <ArrowIcon size={18} />
          </Link>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Próxima: {longDayFormatter.format(next.date)} ·{" "}
              <span data-numeric>
                {next.pending.length} {next.pending.length === 1 ? "conteúdo" : "conteúdos"} ·{" "}
                {next.remainingMinutes} min
              </span>
            </span>
          </p>
        </div>
      ) : (
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/onboarding"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "icon-draw")}
          >
            Atualizar minha trilha
            <ArrowIcon size={18} />
          </Link>
          <Link
            href="/cursos"
            className={cn(buttonVariants({ variant: "tertiary", size: "lg" }))}
          >
            Explorar catálogo
          </Link>
        </div>
      )}
    </section>
  );
}
