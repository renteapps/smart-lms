"use client";

import { CalendarClock, Sparkles } from "lucide-react";
import { Card, ProgressBar } from "@heroui/react";
import {
  formatAiCreditRenewal,
  formatAiCredits,
  type AiCreditBalance,
} from "@/lib/aiCredits";

type AiCreditsCardProps = {
  balance: AiCreditBalance | null;
};

const percentage = (remaining: number, limit: number) =>
  limit > 0 ? Math.min(100, Math.round((remaining / limit) * 100)) : 0;

export function AiCreditsCard({ balance }: AiCreditsCardProps) {
  const weeklyRemaining = balance?.weeklyRemaining ?? 0;
  const weeklyLimit = balance?.weeklyLimit ?? 0;
  const monthlyRemaining = balance?.monthlyRemaining ?? 0;
  const monthlyLimit = balance?.monthlyLimit ?? 0;
  const dailyRemaining = balance?.dailyRemaining ?? 0;
  const dailyLimit = balance?.dailyLimit ?? 0;

  return (
      <Card className="border-hairline">
        <Card.Content className="gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold text-foreground">Créditos de IA</p>
                <p className="text-xs text-muted">
                  {balance
                    ? `${formatAiCredits(balance.availableCredits)} disponíveis`
                    : "Saldo indisponível"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ProgressBar
              value={percentage(dailyRemaining, dailyLimit)}
              color="warning"
              size="sm"
              aria-label="Créditos diários restantes"
            >
              <div className="mb-1.5 flex items-end justify-between gap-3 text-xs">
                <span className="font-semibold text-muted">Hoje</span>
                <span className="font-bold text-foreground" data-numeric>{formatAiCredits(dailyRemaining)} de {formatAiCredits(dailyLimit)}</span>
              </div>
              <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
            </ProgressBar>

            <ProgressBar
              value={percentage(weeklyRemaining, weeklyLimit)}
              color="accent"
              size="sm"
              aria-label="Créditos semanais restantes"
            >
              <div className="mb-1.5 flex items-end justify-between gap-3 text-xs">
                <span className="font-semibold text-muted">Nesta semana</span>
                <span className="font-bold text-foreground" data-numeric>
                  {formatAiCredits(weeklyRemaining)} de {formatAiCredits(weeklyLimit)}
                </span>
              </div>
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>

            <ProgressBar
              value={percentage(monthlyRemaining, monthlyLimit)}
              color="success"
              size="sm"
              aria-label="Créditos mensais restantes"
            >
              <div className="mb-1.5 flex items-end justify-between gap-3 text-xs">
                <span className="font-semibold text-muted">Neste mês</span>
                <span className="font-bold text-foreground" data-numeric>
                  {formatAiCredits(monthlyRemaining)} de {formatAiCredits(monthlyLimit)}
                </span>
              </div>
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </div>

          {balance && (
            <div className="space-y-2 rounded-xl bg-background-secondary p-3 text-xs">
              <p className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <CalendarClock className="size-3.5" aria-hidden="true" /> Semana renova
                </span>
                <span className="font-semibold text-foreground">
                  {formatAiCreditRenewal(balance.weeklyRenewsAt)}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <CalendarClock className="size-3.5" aria-hidden="true" /> Mês renova
                </span>
                <span className="font-semibold text-foreground">
                  {formatAiCreditRenewal(balance.monthlyRenewsAt)}
                </span>
              </p>
              {balance.additionalCredits > 0 && (
                <p className="border-t border-separator pt-2 text-muted">
                  <strong className="font-semibold text-foreground" data-numeric>
                    +{formatAiCredits(balance.additionalCredits)} extras
                  </strong>{" "}
                  sem vencimento, já incluídos no saldo disponível.
                </p>
              )}
            </div>
          )}

          <p className="rounded-xl border border-hairline p-3 text-center text-xs text-muted">
            Sua franquia é definida pelo plano. Não há compra de créditos nesta versão.
          </p>
        </Card.Content>
      </Card>
  );
}
