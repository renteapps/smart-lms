"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, MessageSquare, Plus, Route, TrendingUp, Users } from "lucide-react";
import { Button, Card, buttonVariants } from "@heroui/react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";

const activity = [
  { person: "Marina Souza", action: "concluiu Comunicação que move pessoas", time: "há 12 min", tone: "positive" as const },
  { person: "Rafael Lima", action: "iniciou sua trilha de liderança", time: "há 34 min", tone: "primary" as const },
  { person: "Curso atualizado", action: "Feedback que transforma foi publicado", time: "há 1 h", tone: "warning" as const },
];

const quickActions = [
  { href: "/admin/onboarding", icon: Route, label: "Editar trilha", tone: "bg-accent-soft text-accent-soft-foreground" },
  { href: "/admin/cursos", icon: BookOpen, label: "Gerenciar cursos", tone: "bg-success-soft text-success-soft-foreground" },
  { href: "/admin/comentarios", icon: MessageSquare, label: "Moderar comentários", tone: "bg-warning-soft text-warning-soft-foreground" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Visão operacional"
        title="Bom dia, Nohan"
        description="Acompanhe o que está acontecendo na plataforma e priorize as próximas ações."
        actions={
          <Link href="/admin/cursos/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
            <Plus className="size-4" aria-hidden="true" /> Novo curso
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <StatCard label="Usuários ativos" value="1.248" helper="+8,2% nos últimos 30 dias" icon={Users} tone="primary" />
        <StatCard label="Cursos publicados" value="24" helper="3 em edição" icon={BookOpen} tone="sage" />
        <StatCard label="Horas assistidas" value="12,5 mil" helper="+1,4 mil neste mês" icon={Clock3} tone="terracotta" />
        <StatCard label="Conclusão média" value="68%" helper="4 p.p. acima do mês anterior" icon={TrendingUp} tone="neutral" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <Card.Header className="flex flex-row items-start justify-between gap-4">
            <div>
              <Card.Title>Atividade recente</Card.Title>
              <Card.Description>Movimentos importantes nas últimas horas</Card.Description>
            </div>
            <Button variant="tertiary" size="sm">
              Ver relatório
            </Button>
          </Card.Header>
          <Card.Content className="px-0">
            <ul className="divide-y divide-separator">
              {activity.map((item) => (
                <li key={`${item.person}-${item.time}`} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">
                      <strong className="font-semibold text-foreground">{item.person}</strong> {item.action}
                    </p>
                    <p className="mt-1 text-xs text-muted">{item.time}</p>
                  </div>
                  <StatusBadge tone={item.tone}>Atualização</StatusBadge>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Ações rápidas</Card.Title>
            <Card.Description>Atalhos para as tarefas mais frequentes</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-2">
            {quickActions.map(({ href, icon: Icon, label, tone }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:bg-accent-soft"
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tone)}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex-1">{label}</span>
                <ArrowRight className="size-4 text-muted" aria-hidden="true" />
              </Link>
            ))}
          </Card.Content>
        </Card>
      </section>
    </div>
  );
}
