import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-5 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.035em] text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-text-soft sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: "primary" | "sage" | "terracotta" | "neutral";
};

const toneClasses = {
  primary: "bg-primary-pale text-primary",
  sage: "bg-accent-sage/14 text-positive",
  terracotta: "bg-accent-orange/14 text-accent-orange",
  neutral: "bg-canvas-soft text-text-soft",
};

export function StatCard({ label, value, helper, icon: Icon, tone = "primary" }: StatCardProps) {
  return (
    <article className="editorial-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text-soft">{label}</p>
          <p className="mt-3 font-display text-3xl font-extrabold tracking-[-0.04em] text-ink">{value}</p>
          {helper && <p className="mt-2 text-xs font-medium text-text-mute">{helper}</p>}
        </div>
        <span className={cn("grid h-11 w-11 place-items-center rounded-[14px]", toneClasses[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "positive" | "warning" | "negative" | "neutral" | "primary";
};

const statusClasses = {
  positive: "bg-positive/10 text-positive",
  warning: "bg-warning/10 text-warning",
  negative: "bg-negative/10 text-negative",
  neutral: "bg-canvas-soft text-text-soft",
  primary: "bg-primary-pale text-primary-active",
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", statusClasses[tone])}>{children}</span>;
}
