"use client";

import { CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useId, useState } from "react";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type TrailProgressPanelProps = {
  /** 0–100, já arredondado pela página. */
  completion: number;
  completed: number;
  total: number;
  /** Minutos semanais da rotina já ajustada pelo feedback das sessões. */
  weeklyGoal: number;
};

/**
 * O painel de progresso da trilha.
 *
 * Antes eram três cartões brancos (`33%`, `4/12`, `95 min`) mais uma barra de
 * progresso que repetia o primeiro deles — quatro objetos dizendo três coisas.
 * Aqui o anel é o número principal e as outras duas métricas ficam ao lado como
 * apoio, num objeto só de vidro sobre o fundo desfocado da página.
 */
export default function TrailProgressPanel({
  completion,
  completed,
  total,
  weeklyGoal,
}: TrailProgressPanelProps) {
  const gradientId = useId();

  /*
   * O anel entra vazio e preenche na montagem. Sem o estado o `strokeDashoffset`
   * já nasce no valor final e não há transição alguma para animar.
   */
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const offset = CIRCUMFERENCE * (1 - (filled ? Math.min(Math.max(completion, 0), 100) : 0) / 100);

  return (
    <div className="liquid-glass flex flex-col items-center gap-7 rounded-[1.75rem] p-6 sm:flex-row sm:gap-8 sm:p-7 lg:min-w-[24rem]">
      <div className="relative grid size-36 shrink-0 place-items-center">
        {/*
         * O giro vive nos círculos, não no <svg>: girar o elemento inteiro
         * levaria o gradiente junto e o arco começaria em verde no topo.
         */}
        <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--success)" />
            </linearGradient>
          </defs>
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--hairline-strong)"
            strokeWidth="9"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            className="transition-[stroke-dashoffset] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          />
        </svg>

        <div className="absolute inset-0 grid place-content-center text-center">
          <span
            className="font-display text-4xl font-extrabold leading-none tracking-[-0.04em] text-foreground"
            data-numeric
          >
            {completion}%
          </span>
          <span className="mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-muted">
            da trilha
          </span>
        </div>
      </div>

      <dl className="flex w-full min-w-0 flex-row gap-6 sm:flex-col sm:gap-5">
        <div className="min-w-0 flex-1">
          <dt className="flex items-center gap-2 text-sm font-medium text-muted">
            <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
            Concluídos
          </dt>
          <dd
            className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground"
            data-numeric
          >
            {completed}
            <span className="text-muted"> / {total}</span>
          </dd>
        </div>

        <div className="min-w-0 flex-1 sm:border-t sm:border-hairline sm:pt-5">
          <dt className="flex items-center gap-2 text-sm font-medium text-muted">
            <Clock3 className="size-4 shrink-0 text-warning" aria-hidden="true" />
            Meta semanal
          </dt>
          <dd
            className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground"
            data-numeric
          >
            {weeklyGoal}
            <span className="text-muted"> min</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
