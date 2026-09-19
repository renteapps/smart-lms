import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
/*
 * Subcaminho em vez do barril: `@heroui/react` reexporta react-aria-components,
 * que é `client-only` — e estes componentes são usados por páginas de servidor.
 * Mesmo motivo do `@heroui/react/separator` no rodapé.
 */
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { EmptyState } from "@heroui/react/empty-state";
import { Skeleton } from "@heroui/react/skeleton";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Link "Voltar" acima do título, para páginas de detalhe/edição. */
  back?: { href: string; label?: string };
  /** Fixa o cabeçalho sob a barra superior (76px) ao rolar formulários longos. */
  sticky?: boolean;
};

export function PageHeader({ eyebrow, title, description, actions, className, back, sticky }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-separator pb-6 sm:flex-row sm:items-end sm:justify-between",
        sticky && "sticky top-[76px] z-10 bg-background/95 pt-4 backdrop-blur-xl",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {back && (
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {back.label ?? "Voltar"}
          </Link>
        )}
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
  /** Status de domínio (ver `statusTones`); tem precedência sobre `tone`. */
  status?: string;
};

const statusColors = {
  positive: "success",
  warning: "warning",
  negative: "danger",
  neutral: "default",
  primary: "accent",
} as const satisfies Record<StatusTone, "success" | "warning" | "danger" | "default" | "accent">;

export function StatusBadge({ children, tone = "neutral", status }: StatusBadgeProps) {
  const resolved = status ? toneForStatus(status) : tone;
  return (
    <Chip color={statusColors[resolved]} variant="soft" size="sm">
      {children}
    </Chip>
  );
}

/*
 * Mapa único de status de domínio → tom. Use `<StatusBadge status="trial">`
 * em vez de derivar o tom de rótulos em português ("Ativo", "Aguardando").
 */
export const statusTones = {
  active: "positive",
  approved: "positive",
  paid: "positive",
  published: "positive",
  completed: "positive",
  trial: "primary",
  pending: "warning",
  draft: "warning",
  past_due: "warning",
  suspended: "warning",
  inactive: "neutral",
  archived: "neutral",
  canceled: "negative",
  cancelled: "negative",
  failed: "negative",
  rejected: "negative",
  expired: "negative",
  // Status em português usados por tabelas legadas (empresas B2B).
  ativo: "positive",
  inativo: "neutral",
  suspenso: "warning",
} as const satisfies Record<string, StatusTone>;

export type DomainStatus = keyof typeof statusTones;

export function toneForStatus(status: string): StatusTone {
  return (statusTones as Record<string, StatusTone>)[status] ?? "neutral";
}

type AdminEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** CTA principal ou "Limpar filtros". */
  action?: ReactNode;
  className?: string;
};

/** Estado vazio padrão do admin: um único espaçamento, ícone e hierarquia de texto. */
export function AdminEmptyState({ icon: Icon, title, description, action, className }: AdminEmptyStateProps) {
  return (
    <EmptyState className={cn("flex flex-col items-center gap-2 px-6 py-14 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
        <Icon className="size-5 text-muted" aria-hidden="true" />
      </span>
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </EmptyState>
  );
}

/** Esqueleto de página: título, cartões de métricas opcionais e um bloco de conteúdo. */
export function PageSkeleton({ stats = 0, label = "Carregando" }: { stats?: number; label?: string }) {
  return (
    <div className="space-y-7" aria-busy="true" aria-label={label}>
      <div className="space-y-3 border-b border-separator pb-6">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </div>
      {stats > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}
      <TableSkeleton />
    </div>
  );
}

/** Esqueleto de tabela dentro de um cartão. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <Card.Content className="space-y-3">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </Card.Content>
    </Card>
  );
}
