"use client";

import { Check, Flame, TrendingUp } from "lucide-react";
import { Rise } from "@/components/ui/Rise";
import type { StudyStats } from "@/lib/studentHome";
import { cn } from "@/lib/utils";

function formatHours(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  // Uma casa decimal: "6,2h" compara melhor que "6h 12min" numa régua.
  return `${hours.toFixed(1).replace(".", ",")}h`;
}

type StudyLedgerProps = {
  stats: StudyStats;
};

/**
 * Régua de dados: três números que respondem "como estou indo?" sem pedir três
 * cartões. Hairline no topo, sem caixa.
 *
 * Todos os valores vêm da trilha real. Antes eram literais no JSX — `4 de 5`,
 * `7 dias`, `6,2h` — o que tornava o painel impossível de acreditar.
 */
export default function StudyLedger({ stats }: StudyLedgerProps) {
  return (
    <section className="editorial-container pb-[clamp(2rem,4vw,3rem)]">
      <Rise>
        <dl className="grid gap-8 border-t border-hairline pt-8 sm:grid-cols-3 sm:gap-10 sm:divide-x sm:divide-hairline">
          <div className="min-w-0">
            <dt className="eyebrow">Meta da semana</dt>
            <dd className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground">
              <span data-numeric>
                {stats.weekDoneDays} de {stats.weekGoalDays}
              </span>{" "}
              {stats.weekGoalDays === 1 ? "dia" : "dias"}
            </dd>
            <ul className="mt-4 flex items-center gap-1.5" aria-label="Dias de estudo desta semana">
              {stats.weekDays.map((day) => (
                <li key={day.weekday}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-7 place-items-center rounded-md text-xs font-bold",
                      day.done && "bg-accent text-accent-foreground",
                      !day.done && day.isToday && "bg-accent-soft text-accent-soft-foreground",
                      !day.done && !day.isToday && day.planned && "bg-default text-foreground",
                      !day.done && !day.isToday && !day.planned && "bg-default/50 text-muted",
                    )}
                  >
                    {day.done ? <Check className="size-3.5" /> : day.label.slice(0, 1)}
                  </span>
                  <span className="sr-only">
                    {day.label}:{" "}
                    {day.done
                      ? "concluído"
                      : day.isToday
                        ? "hoje"
                        : day.planned
                          ? day.isFuture ? "planejado" : "sem estudo"
                          : "fora da sua rotina"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 sm:pl-10">
            <dt className="eyebrow">Sequência atual</dt>
            <dd className="mt-2 flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-foreground">
              <Flame className="size-5 text-warning" aria-hidden="true" />
              <span data-numeric>{stats.streakDays}</span> {stats.streakDays === 1 ? "dia" : "dias"}
            </dd>
            <p className="mt-4 text-sm text-muted">
              {stats.streakDays === 0
                ? "Comece hoje para abrir uma sequência."
                : "Dias fora da sua rotina não quebram a sequência."}
            </p>
          </div>

          <div className="min-w-0 sm:pl-10">
            <dt className="eyebrow">Tempo investido</dt>
            <dd className="mt-2 flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-foreground">
              <TrendingUp className="size-5 text-success" aria-hidden="true" />
              <span data-numeric>{formatHours(stats.minutesLast30Days)}</span>
            </dd>
            <p className="mt-4 text-sm text-muted">
              Somadas nos últimos 30 dias · <span data-numeric>{stats.completionRate}%</span> da
              trilha concluída.
            </p>
          </div>
        </dl>
      </Rise>
    </section>
  );
}
