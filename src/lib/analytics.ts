export const ANALYTICS_PERIODS = ["7d", "30d", "90d", "12m", "tudo"] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "7d": "últimos 7 dias",
  "30d": "últimos 30 dias",
  "90d": "últimos 90 dias",
  "12m": "últimos 12 meses",
  tudo: "todo o histórico",
};

export function parseAnalyticsPeriod(value: string | string[] | undefined): AnalyticsPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  return ANALYTICS_PERIODS.includes(candidate as AnalyticsPeriod)
    ? (candidate as AnalyticsPeriod)
    : "30d";
}

export function getAnalyticsPeriodBounds(period: AnalyticsPeriod, now = new Date()) {
  const end = new Date(now);
  let start: Date | null = null;

  if (period === "12m") {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
  } else if (period !== "tudo") {
    const days = Number.parseInt(period, 10);
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days);
  }

  const previousStart = start
    ? new Date(start.getTime() - (end.getTime() - start.getTime()))
    : null;

  return { start, previousStart, end };
}

export function percentageChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

export function formatAnalyticsHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0 h";
  if (hours >= 1000) {
    return `${(hours / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil h`;
  }
  return `${hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}
