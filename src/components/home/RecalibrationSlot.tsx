"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, Check, Gauge, RotateCcw } from "lucide-react";
import { Button, buttonVariants, Card, Chip, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { ArrowIcon, SparkIcon } from "@/components/ui/AnimatedIcon";
import { Rise } from "@/components/ui/Rise";
import type { Recalibration } from "@/lib/refinementSurveys";
import type { SessionLoadRating } from "@/types/trilha";
import { cn } from "@/lib/utils";

const feedbackOptions: Array<{ value: SessionLoadRating; label: string; detail: string }> = [
  { value: "light", label: "Foi leve", detail: "+10 min nas próximas" },
  { value: "right", label: "Na medida", detail: "mantém o ritmo" },
  { value: "heavy", label: "Foi pesado", detail: "-10 min nas próximas" },
];

type RecalibrationSlotProps = {
  /** `null` quando não há nada a perguntar — só o resultado do ajuste anterior. */
  recalibration: Recalibration | null;
  onFeedback: (rating: SessionLoadRating) => void;
  onAnswerSurvey: (questionId: string, values: string[]) => void;
  /** Mensagem do que acabou de mudar na trilha, quando houve mudança. */
  outcome: string | null;
};

function Shell({
  icon,
  eyebrow,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="editorial-container pb-[clamp(2rem,4vw,3rem)]">
      <Rise>
        <Card className="border-hairline">
          <Card.Content className="gap-6 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                {icon}
              </span>
              <div className="min-w-0">
                <p className="eyebrow">{eyebrow}</p>
                <h2 className="mt-1.5 font-display text-lg font-extrabold tracking-[-0.02em] text-foreground sm:text-xl">
                  {title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{hint}</p>
              </div>
            </div>
            {children}
          </Card.Content>
        </Card>
      </Rise>
    </section>
  );
}

/**
 * Um cartão de recalibração por vez — nunca dois.
 *
 * Este slot é o que torna a personalização contínua em vez de uma foto tirada no
 * onboarding: o que o aluno responde aqui volta para `trail.answers` e
 * re-executa o motor de trilha, preservando o que já foi concluído.
 */
export default function RecalibrationSlot({
  recalibration,
  onFeedback,
  onAnswerSurvey,
  outcome,
}: RecalibrationSlotProps) {
  const [selected, setSelected] = useState<string[]>(
    recalibration?.kind === "survey" ? recalibration.current : [],
  );

  // O resultado do ajuste vence a próxima pergunta: quem acabou de responder
  // precisa ver o efeito antes de ser interpelado de novo.
  if (outcome) {
    return (
      <Shell
        icon={<Check className="size-5" aria-hidden="true" />}
        eyebrow="Trilha atualizada"
        title="Pronto — já ajustamos."
        hint={outcome}
      >
        <Link
          href="/minha-trilha"
          className={cn(buttonVariants({ variant: "tertiary", size: "sm" }), "icon-draw self-start")}
        >
          Ver o plano atualizado
          <ArrowIcon size={14} />
        </Link>
      </Shell>
    );
  }

  if (!recalibration) return null;

  if (recalibration.kind === "session-feedback") {
    return (
      <Shell
        icon={<Gauge className="size-5" aria-hidden="true" />}
        eyebrow="Calibrar ritmo"
        title="Como foi a carga de hoje?"
        hint={`A sessão tinha ${recalibration.plannedMinutes} minutos. Sua resposta ajusta só as próximas — a meta atual é de ${recalibration.currentTargetMinutes} minutos por sessão.`}
      >
        <div className="flex flex-wrap gap-3">
          {feedbackOptions.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              onClick={() => onFeedback(option.value)}
              className="flex-col items-start gap-0.5 py-2.5"
            >
              <span className="font-bold">{option.label}</span>
              <span className="text-xs font-normal text-muted">{option.detail}</span>
            </Button>
          ))}
        </div>
      </Shell>
    );
  }

  if (recalibration.kind === "profile-test") {
    return (
      <Shell
        icon={<Brain className="size-5" aria-hidden="true" />}
        eyebrow="Aprofundar seu perfil"
        title={recalibration.test.title}
        hint={`${recalibration.reason} São ${recalibration.test.questions.length} perguntas.`}
      >
        <Link
          href="/cursos"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "icon-draw self-start")}
        >
          Fazer o diagnóstico
          <ArrowIcon size={14} />
        </Link>
      </Shell>
    );
  }

  const { question } = recalibration;
  const isMultiple = question.type === "multiple";
  const unchanged =
    selected.length === recalibration.current.length
    && selected.every((value) => recalibration.current.includes(value));

  return (
    <Shell
      icon={<SparkIcon size={20} />}
      eyebrow="Ajuste rápido · 10 segundos"
      title={question.text}
      hint={recalibration.reason}
    >
      <div className="flex flex-col gap-5">
        <ToggleButtonGroup
          aria-label={question.text}
          selectionMode={isMultiple ? "multiple" : "single"}
          isDetached
          selectedKeys={selected}
          onSelectionChange={(keys) => setSelected(Array.from(keys).map(String))}
          className="flex flex-wrap gap-2"
        >
          {question.options.map((option) => (
            <ToggleButton key={option.label} id={option.label}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            isDisabled={selected.length === 0}
            onClick={() => onAnswerSurvey(question.id, selected)}
          >
            {unchanged ? "Continua valendo" : "Atualizar minha trilha"}
          </Button>
          {!unchanged && recalibration.current.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(recalibration.current)}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Desfazer
            </Button>
          )}
          {recalibration.current.length > 0 && (
            <Chip color="default" variant="soft" size="sm">
              Antes: {recalibration.current.join(", ")}
            </Chip>
          )}
        </div>
      </div>
    </Shell>
  );
}
