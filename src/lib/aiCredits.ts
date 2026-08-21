import type { DB } from "@/lib/data/types";
import { roundCredits } from "@/lib/aiPricing";

export type AiCreditBalance = {
  dailyRemaining: number;
  dailyLimit: number;
  dailyRenewsAt: string;
  weeklyRemaining: number;
  weeklyLimit: number;
  weeklyRenewsAt: string;
  monthlyRemaining: number;
  monthlyLimit: number;
  monthlyRenewsAt: string;
  additionalCredits: number;
  availableCredits: number;
  creditValueBrl: number;
};

const asNonNegativeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, roundCredits(parsed)) : 0;
};

export function parseAiCreditBalance(value: unknown): AiCreditBalance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const dailyRenewsAt = typeof row.daily_renews_at === "string" ? row.daily_renews_at : "";
  const weeklyRenewsAt = typeof row.weekly_renews_at === "string" ? row.weekly_renews_at : "";
  const monthlyRenewsAt = typeof row.monthly_renews_at === "string" ? row.monthly_renews_at : "";

  if (!dailyRenewsAt || !weeklyRenewsAt || !monthlyRenewsAt) return null;

  return {
    dailyRemaining: asNonNegativeNumber(row.daily_remaining),
    dailyLimit: asNonNegativeNumber(row.daily_limit),
    dailyRenewsAt,
    weeklyRemaining: asNonNegativeNumber(row.weekly_remaining),
    weeklyLimit: asNonNegativeNumber(row.weekly_limit),
    weeklyRenewsAt,
    monthlyRemaining: asNonNegativeNumber(row.monthly_remaining),
    monthlyLimit: asNonNegativeNumber(row.monthly_limit),
    monthlyRenewsAt,
    additionalCredits: asNonNegativeNumber(row.additional_credits),
    availableCredits: asNonNegativeNumber(row.available_credits),
    creditValueBrl: Math.max(0, Number(row.credit_value_brl) || 0.01),
  };
}

/** Formata créditos fracionários (até 4 casas), cortando zeros à direita: 25 -> "25", 0.03 -> "0,03". */
export function formatAiCredits(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value);
}

/** Formata custo/valor real em reais com 4 casas fixas: 23.6056 -> "R$ 23,6056". */
export function formatAiCostBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

export async function getAiCreditBalance(db: DB, userId?: string): Promise<AiCreditBalance | null> {
  const { data, error } = await db.rpc(
    "get_ai_credit_balance",
    userId ? { p_user_id: userId } : undefined,
  );

  if (error) {
    console.error("[ai-credits:balance]", error.message);
    return null;
  }

  return parseAiCreditBalance(data);
}

export function formatAiCreditRenewal(isoDate: string) {
  if (!isoDate) return "Data indisponível";

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Fortaleza",
  }).format(date);
}
