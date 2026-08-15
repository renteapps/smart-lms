"use client";

import Link from "next/link";
import { CalendarDays, ListChecks, Sparkles } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Card } from "@heroui/react/card";
import { ArrowIcon, TrailIcon } from "@/components/ui/AnimatedIcon";
import { Rise } from "@/components/ui/Rise";
import type { Questionnaire } from "@/types/trilha";
import { cn } from "@/lib/utils";

type HomeEmptyStateProps = {
  questionnaire: Questionnaire | null;
};

/**
 * Estado zero honesto.
 *
 * Antes, quem nunca respondeu o onboarding via uma home completa: "Retomar aula"
 * apontando para uma aula fixa do catálogo, meta semanal de 4/5, sequência de 7
 * dias e uma trilha de demonstração gerada por `createDemoTrail()` — sem
 * nenhuma indicação de que nada daquilo era real. A tela inteira agora é o
 * convite, e não há um único número inventado nela.
 */
export default function HomeEmptyState({ questionnaire }: HomeEmptyStateProps) {
  const questions = (questionnaire?.questions || []).filter(
    (question) => question.type !== "availability",
  );
  const steps = questionnaire?.questions.length ?? 0;

  return (
    <main className="editorial-container flex min-h-[80vh] items-center py-16">
      <div className="w-full">
        <Rise>
          <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
            <TrailIcon size={28} />
          </span>

          <p className="eyebrow mt-7">Comece por aqui</p>
          <h1 className="display-1 mt-3 max-w-3xl text-foreground">
            Vamos montar uma trilha que cabe na sua semana.
          </h1>
          <p className="lede mt-6">
            São {steps > 0 ? `${steps} perguntas` : "poucas perguntas"} rápidas. A partir delas
            organizamos os conteúdos de todos os cursos numa sequência sua, distribuída nos dias e
            no tempo que você tiver.
          </p>

          <Link
            href="/onboarding"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "icon-draw mt-9")}
          >
            Montar minha trilha
            <ArrowIcon size={18} />
          </Link>
        </Rise>

        <div className="mt-[clamp(3rem,6vw,4.5rem)] grid gap-5 md:grid-cols-3">
          {[
            {
              icon: ListChecks,
              title: "O que vamos perguntar",
              body: questions.length > 0
                ? questions.map((question) => question.text).join(" · ")
                : "Seu objetivo, o que te trava hoje e as habilidades que quer desenvolver.",
            },
            {
              icon: CalendarDays,
              title: "Quanto tempo você tem",
              body: "Escolha os dias da semana e quantos minutos cabem por sessão. A agenda respeita esse limite.",
            },
            {
              icon: Sparkles,
              title: "O que você recebe",
              body: "Uma sequência ordenada, com pré-requisitos resolvidos e o motivo de cada conteúdo estar ali.",
            },
          ].map(({ icon: Icon, title, body }, index) => (
            <Rise key={title} delay={index * 90}>
              <Card className="h-full border-hairline">
                <Card.Content className="gap-4 p-6">
                  <span className="grid size-10 place-items-center rounded-xl bg-default text-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display font-extrabold tracking-[-0.02em] text-foreground">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                  </div>
                </Card.Content>
              </Card>
            </Rise>
          ))}
        </div>
      </div>
    </main>
  );
}
