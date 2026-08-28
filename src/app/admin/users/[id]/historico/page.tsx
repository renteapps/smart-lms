import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileEdit,
  Info,
  LogIn,
  Monitor,
  PlayCircle,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { Card, EmptyState, Table } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";
import { getAuthUserInfo } from "@/lib/supabase/authAdmin";

type Tone = { cor: string; bg: string };

const TONES = {
  success: { cor: "text-success-soft-foreground", bg: "bg-success-soft" },
  accent: { cor: "text-accent-soft-foreground", bg: "bg-accent-soft" },
  warning: { cor: "text-warning-soft-foreground", bg: "bg-warning-soft" },
  muted: { cor: "text-muted", bg: "bg-background-secondary" },
} satisfies Record<string, Tone>;

type TimelineEntry = {
  id: string;
  acao: string;
  detalhe: string;
  timestamp: number;
  data: string;
  ip: string;
  icon: LucideIcon;
  cor: string;
  bg: string;
};

const dateFmt = (value: string | number | Date) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Transforma "publish_questionnaire" em "Publish questionnaire". */
const humanize = (slug: string) => {
  const clean = slug.replace(/[_-]+/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Ação";
};

/** Primeiro item não vazio de um relacionamento aninhado do PostgREST. */
const one = <T,>(value: T | T[] | null | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value ?? undefined;

type AuditRow = {
  id: string;
  action: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

function describeAudit(log: AuditRow, subjectId: string): { acao: string; detalhe: string; icon: LucideIcon; tone: Tone } {
  const meta = log.metadata ?? {};
  const target = [log.target_type ? humanize(log.target_type) : null, log.target_id ? `#${log.target_id}` : null]
    .filter(Boolean)
    .join(" ");

  switch (log.action) {
    case "login":
      return { acao: "Login", detalhe: "Acesso à plataforma", icon: LogIn, tone: TONES.success };
    case "logout":
      return { acao: "Logout", detalhe: "Encerrou a sessão", icon: LogIn, tone: TONES.muted };
    case "update_profile": {
      const adminId = typeof meta.admin_id === "string" ? meta.admin_id : null;
      const byAdmin = adminId && adminId !== subjectId;
      return {
        acao: "Atualização de perfil",
        detalhe: byAdmin ? "Dados alterados por um administrador" : "Alterou os próprios dados",
        icon: FileEdit,
        tone: TONES.accent,
      };
    }
    case "course_access":
      return {
        acao: "Acesso a curso",
        detalhe: typeof meta.course_name === "string" ? `Acessou: ${meta.course_name}` : "Acessou um curso",
        icon: Monitor,
        tone: TONES.warning,
      };
    case "publish_questionnaire": {
      const count = typeof meta.questionCount === "number" ? `${meta.questionCount} perguntas` : null;
      return {
        acao: "Publicou questionário da trilha",
        detalhe: [log.target_id ? `Versão ${log.target_id}` : null, count].filter(Boolean).join(" · ") || "Trilha de onboarding",
        icon: ShieldAlert,
        tone: TONES.accent,
      };
    }
    default:
      return {
        acao: humanize(log.action ?? "acao"),
        detalhe: target || "Sem detalhes adicionais",
        icon: Info,
        tone: TONES.muted,
      };
  }
}

export default async function AdminUserHistoricoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [profileResult, auditResult, lessonResult, authInfo] = await Promise.all([
    supabase.from("profiles").select("full_name, created_at").eq("id", id).maybeSingle(),
    supabase
      .from("audit_logs")
      .select("id, action, target_type, target_id, metadata, ip_address, created_at")
      .eq("actor_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("lesson_progress")
      .select(
        "id, is_completed, completed_at, updated_at, last_watched_second, lessons!inner(title, modules!inner(title, courses!inner(title)))",
      )
      .eq("user_id", id)
      .order("updated_at", { ascending: false })
      .limit(25),
    getAuthUserInfo(id),
  ]);

  if (!profileResult.data) {
    notFound();
  }

  const loadError = auditResult.error || lessonResult.error;
  if (loadError) {
    console.error("Erro ao carregar histórico:", loadError.message);
  }

  const entries: TimelineEntry[] = [];

  // 1. Logs de auditoria
  for (const log of (auditResult.data ?? []) as AuditRow[]) {
    const { acao, detalhe, icon, tone } = describeAudit(log, id);
    entries.push({
      id: `audit-${log.id}`,
      acao,
      detalhe,
      timestamp: new Date(log.created_at).getTime(),
      data: dateFmt(log.created_at),
      ip: log.ip_address || "—",
      icon,
      ...tone,
    });
  }

  // 2. Atividade em aulas (concluídas ou efetivamente iniciadas)
  for (const row of lessonResult.data ?? []) {
    const started = (row.last_watched_second as number | null) ?? 0;
    if (!row.is_completed && started <= 0) continue;

    const lesson = one(row.lessons as Record<string, unknown> | Record<string, unknown>[]);
    const moduleRow = one(lesson?.modules as Record<string, unknown> | Record<string, unknown>[]);
    const course = one(moduleRow?.courses as Record<string, unknown> | Record<string, unknown>[]);
    const lessonTitle = (lesson?.title as string)?.trim() || "Aula";
    const courseTitle = (course?.title as string)?.trim() || "Curso";
    const when = row.is_completed
      ? (row.completed_at as string) || (row.updated_at as string)
      : (row.updated_at as string);
    if (!when) continue;

    entries.push({
      id: `lesson-${row.id}`,
      acao: row.is_completed ? "Concluiu uma aula" : "Assistiu uma aula",
      detalhe: `${lessonTitle} · ${courseTitle}`,
      timestamp: new Date(when).getTime(),
      data: dateFmt(when),
      ip: "—",
      icon: row.is_completed ? CheckCircle2 : PlayCircle,
      ...(row.is_completed ? TONES.success : TONES.warning),
    });
  }

  // 3. Âncoras de conta: último login (Auth) e criação da conta
  if (authInfo?.lastSignInAt) {
    entries.push({
      id: "auth-last-sign-in",
      acao: "Último login",
      detalhe: "Sessão autenticada pelo Supabase",
      timestamp: new Date(authInfo.lastSignInAt).getTime(),
      data: dateFmt(authInfo.lastSignInAt),
      ip: "—",
      icon: LogIn,
      ...TONES.success,
    });
  }

  const createdAt = profileResult.data.created_at || authInfo?.createdAt;
  if (createdAt) {
    entries.push({
      id: "account-created",
      acao: "Conta criada",
      detalhe: profileResult.data.full_name ? `Perfil de ${profileResult.data.full_name}` : "Cadastro na plataforma",
      timestamp: new Date(createdAt).getTime(),
      data: dateFmt(createdAt),
      ip: "—",
      icon: UserPlus,
      ...TONES.muted,
    });
  }

  // Colapsa eventos idênticos no mesmo minuto (ex.: um backfill que tocou
  // `updated_at` de várias aulas de uma vez, ou um `login` auditado que
  // repete a âncora "Último login").
  const seen = new Set<string>();
  const historico = entries
    .filter((entry) => Number.isFinite(entry.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((entry) => {
      const key = `${entry.acao}@${entry.data}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 60);

  return (
    <div className="space-y-7 pb-16">
      <div>
        <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-muted hover:text-accent transition-colors text-sm font-medium mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Perfil
        </Link>
        <PageHeader
          eyebrow="Logs e Atividades"
          title="Histórico de Acesso"
          description="Acessos, atividades em aulas e ações administrativas registradas para este usuário."
        />
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-soft bg-warning-soft/40 px-4 py-3 text-sm text-warning-soft-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Parte do histórico não pôde ser carregada agora. Os itens abaixo podem estar incompletos.</p>
        </div>
      )}

      <Card>
        <Card.Header>
          <Card.Title>Últimas atividades</Card.Title>
        </Card.Header>

        <Card.Content className="px-0 pb-0">
          {historico.length === 0 ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <Clock className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Nenhuma atividade registrada</p>
              <p className="text-sm text-muted">As ações deste usuário aparecerão aqui assim que acontecerem.</p>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Histórico de acesso do usuário">
                      <Table.Header>
                        <Table.Column isRowHeader>Ação</Table.Column>
                        <Table.Column>Detalhe</Table.Column>
                        <Table.Column>Data e hora</Table.Column>
                        <Table.Column>Endereço IP</Table.Column>
                      </Table.Header>
                      <Table.Body items={historico}>
                        {(log) => {
                          const Icon = log.icon;
                          return (
                            <Table.Row id={log.id}>
                              <Table.Cell>
                                <div className="flex items-center gap-3">
                                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${log.bg} ${log.cor}`}>
                                    <Icon className="size-4" aria-hidden="true" />
                                  </span>
                                  <span className="font-semibold text-foreground">{log.acao}</span>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="text-muted">{log.detalhe}</Table.Cell>
                              <Table.Cell className="font-medium text-foreground">{log.data}</Table.Cell>
                              <Table.Cell className="font-mono text-xs text-muted">{log.ip}</Table.Cell>
                            </Table.Row>
                          );
                        }}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              <ul className="divide-y divide-separator md:hidden">
                {historico.map((log) => {
                  const Icon = log.icon;
                  return (
                    <li key={log.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${log.bg} ${log.cor}`}>
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">{log.acao}</p>
                          <p className="mt-1 text-sm text-muted">{log.detalhe}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted">
                        <span className="flex items-center gap-1 font-medium"><Clock className="size-3" aria-hidden="true" /> {log.data}</span>
                        <span className="font-mono">{log.ip}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
