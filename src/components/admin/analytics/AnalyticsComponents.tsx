"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  Chip,
  ProgressBar,
  Tooltip,
} from "@heroui/react";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsPeriod } from "@/lib/analytics";

// --- Period Selector with HeroUI Design ---
export type TimePeriod = AnalyticsPeriod;

interface PeriodSelectorProps {
  period: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

export function PeriodSelector({ period, onChange, className }: PeriodSelectorProps) {
  const options: { id: TimePeriod; label: string }[] = [
    { id: "7d", label: "7 dias" },
    { id: "30d", label: "30 dias" },
    { id: "90d", label: "90 dias" },
    { id: "12m", label: "12 meses" },
    { id: "tudo", label: "Geral" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Selecionar período de análise"
      className={cn(
        "inline-flex items-center rounded-xl border border-border bg-surface p-1 shadow-xs",
        className,
      )}
    >
      {options.map((opt) => {
        const isSelected = period === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap",
              isSelected
                ? "bg-accent text-accent-foreground shadow-xs"
                : "text-muted hover:bg-surface-secondary hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function UrlPeriodSelector({
  period,
  className,
}: {
  period: TimePeriod;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextPeriod: TimePeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPeriod === "30d") params.delete("period");
    else params.set("period", nextPeriod);

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <div className={cn(isPending && "opacity-60", className)} aria-busy={isPending}>
      <PeriodSelector period={period} onChange={handleChange} />
    </div>
  );
}

// --- Sparkline Mini Trend ---
export function Sparkline({
  data,
  color = "var(--accent)",
  height = 24,
  width = 56,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0" aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// --- Premium Metric Card with HeroUI Elements ---
export type MetricTone = "primary" | "sage" | "terracotta" | "purple" | "cyan" | "neutral";

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  tooltipText?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  sparklineData?: number[];
  tone?: MetricTone;
}

const toneBackgrounds: Record<MetricTone, string> = {
  primary: "bg-accent-soft text-accent-soft-foreground",
  sage: "bg-success-soft text-success-soft-foreground",
  terracotta: "bg-warning-soft text-warning-soft-foreground",
  purple: "bg-accent-soft text-accent-soft-foreground",
  cyan: "bg-accent-soft text-accent-soft-foreground",
  neutral: "bg-default text-default-foreground",
};

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tooltipText,
  trend,
  sparklineData,
  tone = "primary",
}: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden border border-border bg-surface shadow-xs transition-all duration-200 hover:border-accent/40 hover:shadow-md">
      <Card.Content className="p-5 flex flex-col justify-between h-full space-y-3.5">
        {/* Top Header Row: Label + Icon */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold tracking-wider text-muted uppercase">
              {label}
            </span>
            {tooltipText && (
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <span className="text-muted hover:text-foreground cursor-help shrink-0" tabIndex={0}>
                    <Info className="size-3.5" aria-hidden="true" />
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Content>{tooltipText}</Tooltip.Content>
              </Tooltip.Root>
            )}
          </div>

          {Icon && (
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg shadow-2xs", toneBackgrounds[tone])}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
          )}
        </div>

        {/* Big Metric Value */}
        <div>
          <p className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        </div>

        {/* Footer Row: Trend Badge + Helper + Sparkline */}
        <div className="flex items-center justify-between gap-2 border-t border-separator/80 pt-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap shrink-0",
                  trend.isNeutral
                    ? "bg-default text-muted"
                    : trend.isPositive
                    ? "bg-success-soft text-success font-bold"
                    : "bg-danger-soft text-danger font-bold",
                )}
              >
                {trend.isNeutral ? (
                  <Minus className="size-3" />
                ) : trend.isPositive ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                <span>{trend.value}</span>
              </span>
            )}
            {helper && (
              <span className="text-xs text-muted whitespace-nowrap">
                {helper}
              </span>
            )}
          </div>

          {sparklineData && (
            <div className="hidden sm:block shrink-0">
              <Sparkline data={sparklineData} width={56} height={20} />
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

// --- Interactive SVG Bar Chart ---
export interface BarChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  formattedValue?: string;
}

export function SimpleBarChart({
  data,
  height = 200,
  barColor = "var(--accent)",
  valueFormatter = (v) => `${v}`,
}: {
  data: BarChartDataPoint[];
  height?: number;
  barColor?: string;
  valueFormatter?: (v: number) => string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="relative w-full" style={{ height: height + 40 }}>
      {hoveredIdx !== null && (
        <div
          className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-lg border border-border"
          style={{
            left: `${((hoveredIdx + 0.5) / data.length) * 100}%`,
          }}
        >
          {data[hoveredIdx].label}: {data[hoveredIdx].formattedValue || valueFormatter(data[hoveredIdx].value)}
        </div>
      )}

      <div className="flex h-[200px] items-end gap-2 sm:gap-4 pt-6 border-b border-separator">
        {data.map((item, idx) => {
          const heightPercent = Math.max(4, (item.value / maxValue) * 100);
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={item.label}
              className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div
                className="w-full max-w-[48px] rounded-t-md transition-all duration-200"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: isHovered ? "var(--accent-hover)" : barColor,
                  opacity: hoveredIdx !== null && !isHovered ? 0.45 : 1,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-1 pt-2">
        {data.map((item) => (
          <span key={item.label} className="flex-1 text-center text-[11px] font-medium text-muted truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Interactive SVG Area / Line Chart ---
export interface AreaChartDataPoint {
  label: string;
  value: number;
  formattedValue?: string;
}

export function SimpleAreaChart({
  data,
  height = 220,
  strokeColor = "var(--accent)",
  valueFormatter = (v) => `${v}`,
}: {
  data: AreaChartDataPoint[];
  height?: number;
  strokeColor?: string;
  valueFormatter?: (v: number) => string;
}) {
  const [activePoint, setActivePoint] = useState<number | null>(null);

  if (!data || data.length < 2) return null;

  const min = 0;
  const max = Math.max(...data.map((d) => d.value)) * 1.15 || 1;
  const paddingBottom = 24;
  const chartHeight = height - paddingBottom;
  const chartWidth = 600;

  const getCoordinates = (index: number, val: number) => {
    const x = (index / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((val - min) / (max - min)) * (chartHeight - 16) - 8;
    return { x, y };
  };

  const points = data.map((d, i) => getCoordinates(i, d.value));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.33, 0.66, 1].map((pct) => {
          const y = chartHeight * pct;
          return (
            <line
              key={pct}
              x1="0"
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="var(--separator)"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#area-grad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive dots */}
        {points.map((p, idx) => (
          <g key={idx} className="cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r={activePoint === idx ? 6 : 4}
              fill="var(--surface)"
              stroke={strokeColor}
              strokeWidth="2.5"
              onMouseEnter={() => setActivePoint(idx)}
              onMouseLeave={() => setActivePoint(null)}
            />
          </g>
        ))}
      </svg>

      {activePoint !== null && (
        <div
          className="pointer-events-none absolute -top-4 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-lg border border-border -translate-x-1/2"
          style={{
            left: `${(activePoint / (data.length - 1)) * 100}%`,
          }}
        >
          {data[activePoint].label}: {data[activePoint].formattedValue || valueFormatter(data[activePoint].value)}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-separator pt-2">
        {data.map((item) => (
          <span key={item.label} className="text-xs font-medium text-muted">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Funnel Stage Visualizer with HeroUI Progress Bars ---
export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  dropRate?: number;
}

export function RetentionFunnelChart({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="space-y-4">
      {stages.map((stage, idx) => {
        return (
          <div key={stage.stage} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-foreground">
                <span className="text-muted mr-1.5">0{idx + 1}.</span> {stage.stage}
              </span>
              <div className="flex items-center gap-3">
                {stage.dropRate ? (
                  <Chip size="sm" variant="soft" color="danger" className="text-[10px] font-bold">
                    -{stage.dropRate}% queda
                  </Chip>
                ) : null}
                <strong className="font-display font-bold text-foreground">{stage.percentage}%</strong>
              </div>
            </div>
            <ProgressBar
              aria-label={`Progresso da etapa ${stage.stage}`}
              value={stage.percentage}
              color="accent"
              className="w-full"
            />
          </div>
        );
      })}
    </div>
  );
}
