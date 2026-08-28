import Link from "next/link";
import { BookOpen, Clock3, MessageSquare, Plus, Route, TrendingUp, Users } from "lucide-react";
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02";
import { Button, Card, buttonVariants } from "@heroui/react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

const quickActions = [
  { href: "/admin/onboarding", icon: Route, label: "Editar trilha", tone: "bg-accent-soft text-accent-soft-foreground" },
  { href: "/admin/cursos", icon: BookOpen, label: "Gerenciar cursos", tone: "bg-success-soft text-success-soft-foreground" },
  { href: "/admin/comentarios", icon: MessageSquare, label: "Moderar comentários", tone: "bg-warning-soft text-warning-soft-foreground" },
];

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [activeUsers, published, drafts, auditRows] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_published", false),
    supabase
      .from("audit_logs")
      .select("id, actor_id, action, target_type, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const activeUsersCount = activeUsers.count ?? 0;
  const publishedCourses = published.count ?? 0;
  const draftCourses = drafts.count ?? 0;

  // O nome do autor vem numa segunda query: `audit_logs.actor_id` referencia
  // `profiles.id`, mas o embed `profiles(...)` do PostgREST não resolve aqui.
  const auditLogs = auditRows.data ?? [];
  const actorIds = [...new Set(auditLogs.map((log) => log.actor_id).filter(Boolean))];
  const nameByActor = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
    (actors ?? []).forEach((actor) => nameByActor.set(actor.id, actor.full_name ?? "Sistema"));
  }

  const humanizeAction = (value: string) => value.replace(/[_-]+/g, " ").trim();

  const activity = auditLogs.map((log) => {
    // Tempo relativo
    const diffInMins = Math.max(0, Math.floor((new Date().getTime() - new Date(log.created_at).getTime()) / 60000));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const timeStr =
      diffInDays > 0 ? `há ${diffInDays} d` : diffInHours > 0 ? `há ${diffInHours} h` : `há ${diffInMins} min`;

    let actionLabel: string;
    let tone: "positive" | "primary" | "warning" | "neutral" = "neutral";

    switch (log.action) {
      case "login":
        actionLabel = "fez login na plataforma";
        tone = "primary";
        break;
      case "update_profile":
      case "profile_updated":
        actionLabel = "atualizou um perfil";
        tone = "neutral";
        break;
      case "publish_questionnaire":
        actionLabel = log.target_id
          ? `publicou o questionário da trilha (v${log.target_id})`
          : "publicou o questionário da trilha";
        tone = "positive";
        break;
      case "course_completed":
        actionLabel = "concluiu um curso";
        tone = "positive";
        break;
      default: {
        const target = log.target_type ? ` (${humanizeAction(log.target_type)})` : "";
        actionLabel = `${humanizeAction(String(log.action ?? "ação"))}${target}`;
      }
    }

    return {
      id: log.id,
      person: nameByActor.get(log.actor_id) || "Sistema",
      action: actionLabel,
      time: timeStr,
      tone,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Visão operacional"
        title="Dashboard"
        description="Acompanhe o que está acontecendo na plataforma e priorize as próximas ações."
        actions={
          <Link href="/admin/cursos/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
            <Plus className="size-4" aria-hidden="true" /> Novo curso
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <StatCard label="Usuários ativos" value={(activeUsersCount || 0).toString()} helper="Pessoas ativas no momento" icon={Users} tone="primary" />
        <StatCard label="Cursos publicados" value={publishedCourses.toString()} helper={`${draftCourses} em rascunho`} icon={BookOpen} tone="sage" />
        <StatCard label="Horas assistidas" value="—" helper="Métrica em desenvolvimento" icon={Clock3} tone="terracotta" />
        <StatCard label="Conclusão média" value="—" helper="Métrica em desenvolvimento" icon={TrendingUp} tone="neutral" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <Card.Header className="flex flex-row items-start justify-between gap-4">
            <div>
              <Card.Title>Atividade recente</Card.Title>
              <Card.Description>Movimentos importantes nas últimas horas</Card.Description>
            </div>
          </Card.Header>
          <Card.Content className="px-0">
            {activity.length > 0 ? (
              <ul className="divide-y divide-separator">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted">
                        <strong className="font-semibold text-foreground">{item.person}</strong> {item.action}
                      </p>
                      <p className="mt-1 text-xs text-muted">{item.time}</p>
                    </div>
                    <StatusBadge tone={item.tone}>Atividade</StatusBadge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center text-sm text-muted">Nenhuma atividade recente registrada.</div>
            )}
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
                <ArrowRight02Icon size={16} className="text-muted" aria-hidden="true" />
              </Link>
            ))}
          </Card.Content>
        </Card>
      </section>
    </div>
  );
}
