import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
/*
 * Subcaminho em vez do barril: `@heroui/react` reexporta react-aria-components,
 * que é `client-only` — e estes componentes são usados por páginas de servidor.
 * Mesmo motivo do `@heroui/react/separator` no rodapé.
 */
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
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
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-separator pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

type StatTone = "primary" | "sage" | "terracotta" | "neutral";

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: StatTone;
};

const statToneClasses: Record<StatTone, string> = {
  primary: "bg-accent-soft text-accent-soft-foreground",
  sage: "bg-success-soft text-success-soft-foreground",
  terracotta: "bg-warning-soft text-warning-soft-foreground",
  neutral: "bg-default text-default-foreground",
};

export function StatCard({ label, value, helper, icon: Icon, tone = "primary" }: StatCardProps) {
  return (
    <Card>
      <Card.Content className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-3 break-words font-display text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {helper && <p className="mt-2 text-xs text-muted">{helper}</p>}
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", statToneClasses[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </Card.Content>
    </Card>
  );
}

type StatusTone = "positive" | "warning" | "negative" | "neutral" | "primary";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusTone;
};

const statusColors = {
  positive: "success",
  warning: "warning",
  negative: "danger",
  neutral: "default",
  primary: "accent",
} as const satisfies Record<StatusTone, "success" | "warning" | "danger" | "default" | "accent">;

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <Chip color={statusColors[tone]} variant="soft" size="sm">
      {children}
    </Chip>
  );
}
