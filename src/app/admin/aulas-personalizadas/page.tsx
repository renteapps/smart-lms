import Form from "next/form";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  FileText,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { AgentMarkdown } from "@/components/agentes/AgentMarkdown";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";
import { formatAiCredits } from "@/lib/aiCredits";
import { requireAdmin } from "@/lib/supabase/auth";

const PAGE_SIZE = 20;
const EMPTY_USER_ID = "00000000-0000-0000-0000-000000000000";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type QueryParams = {
  q?: string | string[];
  lesson?: string | string[];
  status?: string | string[];
  page?: string | string[];
  generation?: string | string[];
};

type GenericRow = Record<string, unknown>;

type HistoryRow = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  version: number;
  revision: number;
  status: "generating" | "ready" | "failed";
  model: string;
  credits: number;
  assistantName: string;
  errorCode: string | null;
  createdAt: string;
  finishedAt: string | null;
};

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const one = (value: unknown): GenericRow | null => {
  if (Array.isArray(value)) return (value[0] as GenericRow | undefined) ?? null;
  return value && typeof value === "object" ? value as GenericRow : null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

function mapHistoryRow(row: GenericRow, profiles: Map<string, GenericRow>): HistoryRow {
  const lesson = one(row.lessons);
  const moduleRow = one(lesson?.modules);
  const course = one(moduleRow?.courses);
  const profile = profiles.get(String(row.user_id));
  return {
    id: String(row.id),
    lessonId: String(row.lesson_id),
    lessonTitle: String(lesson?.title ?? "Aula personalizada"),
    courseTitle: String(course?.title ?? "Curso"),
    userId: String(row.user_id),
    studentName: String(profile?.full_name ?? "Aluno sem nome"),
    studentEmail: String(profile?.email ?? ""),
    version: Number(row.version),
    revision: Number(row.config_revision),
    status: row.status as HistoryRow["status"],
    model: String(row.model),
    credits: Number(row.credits_charged) || 0,
    assistantName: String(row.assistant_name ?? "Assistente IA"),
    errorCode: row.error_code ? String(row.error_code) : null,
    createdAt: String(row.created_at),
    finishedAt: row.finished_at ? String(row.finished_at) : null,
  };
}

function historyHref(current: { q: string; lesson: string; status: string; page: number; generation: string }, changes: Partial<Record<keyof typeof current, string | number | null>>) {
  const next = { ...current, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set("q", String(next.q));
  if (next.lesson) params.set("lesson", String(next.lesson));
  if (next.status) params.set("status", String(next.status));
  if (Number(next.page) > 1) params.set("page", String(next.page));
  if (next.generation) params.set("generation", String(next.generation));
  const query = params.toString();
  return `/admin/aulas-personalizadas${query ? `?${query}` : ""}`;
}

const statusDetails = {
  ready: { label: "Concluída", tone: "positive" as const },
  generating: { label: "Gerando", tone: "warning" as const },
  failed: { label: "Falhou", tone: "negative" as const },
};

export default async function PersonalizedLessonHistoryPage({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const raw = await searchParams;
  const q = first(raw.q).trim().slice(0, 100);
  const lessonFilter = UUID_PATTERN.test(first(raw.lesson)) ? first(raw.lesson) : "";
  const requestedStatus = first(raw.status);
  const statusFilter = ["ready", "generating", "failed"].includes(requestedStatus) ? requestedStatus : "";
  const requestedPage = Number.parseInt(first(raw.page), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const selectedGenerationId = UUID_PATTERN.test(first(raw.generation)) ? first(raw.generation) : "";
  const { adminClient } = await requireAdmin();

  const lessonOptionsPromise = adminClient
    .from("lessons")
    .select("id, title, modules!inner(title, courses!inner(id, title))")
    .eq("type", "personalized_ai")
    .order("title");

  let matchingUserIds: string[] | null = null;
  if (q) {
    const pattern = `%${q}%`;
    const [names, emails] = await Promise.all([
      adminClient.from("profiles").select("id").ilike("full_name", pattern).limit(200),
      adminClient.from("profiles").select("id").ilike("email", pattern).limit(200),
    ]);
    matchingUserIds = [...new Set([
      ...(names.data ?? []).map((row) => String(row.id)),
      ...(emails.data ?? []).map((row) => String(row.id)),
      ...(UUID_PATTERN.test(q) ? [q] : []),
    ])];
  }

  let generationsQuery = adminClient
    .from("personalized_lesson_generations")
    .select(
      "id, lesson_id, user_id, version, config_revision, status, model, credits_charged, assistant_name, error_code, created_at, finished_at, lessons!inner(title, modules!inner(title, courses!inner(id, title)))",
      { count: "exact" },
    );
  if (lessonFilter) generationsQuery = generationsQuery.eq("lesson_id", lessonFilter);
  if (statusFilter) generationsQuery = generationsQuery.eq("status", statusFilter);
  if (matchingUserIds) generationsQuery = matchingUserIds.length
    ? generationsQuery.in("user_id", matchingUserIds)
    : generationsQuery.eq("user_id", EMPTY_USER_ID);

  const rangeStart = (page - 1) * PAGE_SIZE;
  const [generationsResult, lessonOptionsResult, totalCount, readyCount, failedCount, generatingCount] = await Promise.all([
    generationsQuery.order("created_at", { ascending: false }).order("id", { ascending: false }).range(rangeStart, rangeStart + PAGE_SIZE - 1),
    lessonOptionsPromise,
    adminClient.from("personalized_lesson_generations").select("id", { count: "exact", head: true }),
    adminClient.from("personalized_lesson_generations").select("id", { count: "exact", head: true }).eq("status", "ready"),
    adminClient.from("personalized_lesson_generations").select("id", { count: "exact", head: true }).eq("status", "failed"),
    adminClient.from("personalized_lesson_generations").select("id", { count: "exact", head: true }).eq("status", "generating"),
  ]);
  if (generationsResult.error) throw new Error(`Não foi possível carregar o histórico: ${generationsResult.error.message}`);

  const rawRows = (generationsResult.data ?? []) as GenericRow[];
  let selectedRaw: GenericRow | null = null;
  if (selectedGenerationId) {
    const selectedResult = await adminClient
      .from("personalized_lesson_generations")
      .select("*, lessons!inner(title, modules!inner(title, courses!inner(id, title)))")
      .eq("id", selectedGenerationId)
      .maybeSingle();
    if (selectedResult.error) throw new Error(`Não foi possível abrir a geração: ${selectedResult.error.message}`);
    selectedRaw = selectedResult.data as GenericRow | null;
  }

  const userIds = [...new Set([
    ...rawRows.map((row) => String(row.user_id)),
    ...(selectedRaw ? [String(selectedRaw.user_id)] : []),
  ])];
  const profilesResult = userIds.length
    ? await adminClient.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [], error: null };
  if (profilesResult.error) throw new Error(`Não foi possível identificar os alunos: ${profilesResult.error.message}`);
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [String(profile.id), profile as GenericRow]));
  const rows = rawRows.map((row) => mapHistoryRow(row, profiles));
  const selected = selectedRaw ? mapHistoryRow(selectedRaw, profiles) : null;
  let selectedUsage: GenericRow | null = null;
  if (selectedRaw?.usage_event_id) {
    const usageResult = await adminClient
      .from("ai_usage_events")
      .select("status, reservation_credits, credits_charged, prompt_tokens, completion_tokens, reasoning_tokens, cached_tokens, provider_cost_brl, generation_id, error_code")
      .eq("id", selectedRaw.usage_event_id)
      .maybeSingle();
    if (!usageResult.error) selectedUsage = usageResult.data as GenericRow | null;
  }
  const sourceManifest = selectedRaw && Array.isArray(selectedRaw.source_manifest)
    ? selectedRaw.source_manifest.filter((source): source is GenericRow => Boolean(source && typeof source === "object"))
    : [];
  let selectedIsActive = false;
  if (selectedRaw?.status === "ready") {
    const newerReadyResult = await adminClient
      .from("personalized_lesson_generations")
      .select("id", { count: "exact", head: true })
      .eq("lesson_id", selectedRaw.lesson_id)
      .eq("user_id", selectedRaw.user_id)
      .eq("status", "ready")
      .gt("version", selectedRaw.version);
    selectedIsActive = !newerReadyResult.error && newerReadyResult.count === 0;
  }

  const totalFiltered = generationsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const lessonOptions = (lessonOptionsResult.data ?? []).map((lesson) => {
    const moduleRow = one(lesson.modules);
    const course = one(moduleRow?.courses);
    return { id: String(lesson.id), title: String(lesson.title), courseTitle: String(course?.title ?? "Curso") };
  });
  const currentQuery = { q, lesson: lessonFilter, status: statusFilter, page, generation: selectedGenerationId };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Aprendizagem · Auditoria"
        title="Aulas personalizadas"
        description="Consulte todas as versões geradas pela IA para cada aluno. O histórico é somente leitura e preserva inclusive tentativas com falha."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo das gerações">
        <StatCard label="Total de versões" value={String(totalCount.count ?? 0)} helper="Todo o histórico preservado" icon={FileText} />
        <StatCard label="Concluídas" value={String(readyCount.count ?? 0)} helper="Conteúdo disponível" icon={Sparkles} tone="sage" />
        <StatCard label="Com falha" value={String(failedCount.count ?? 0)} helper="Tentativas auditáveis" icon={AlertCircle} tone="terracotta" />
        <StatCard label="Em andamento" value={String(generatingCount.count ?? 0)} helper="Gerações ainda abertas" icon={Clock3} tone="neutral" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border p-4 sm:p-5">
          <Form action="/admin/aulas-personalizadas" className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_minmax(14rem,0.8fr)_12rem_auto]">
            <label className="relative block">
              <span className="sr-only">Buscar aluno</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input name="q" defaultValue={q} placeholder="Aluno, e-mail ou ID" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-accent" />
            </label>
            <label>
              <span className="sr-only">Filtrar por aula</span>
              <select name="lesson" defaultValue={lessonFilter} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent">
                <option value="">Todas as aulas</option>
                {lessonOptions.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title} · {lesson.courseTitle}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrar por status</span>
              <select name="status" defaultValue={statusFilter} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent">
                <option value="">Todos os status</option>
                <option value="ready">Concluídas</option>
                <option value="generating">Em andamento</option>
                <option value="failed">Com falha</option>
              </select>
            </label>
            <button type="submit" className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-on-primary hover:brightness-95">Filtrar</button>
          </Form>
          {(q || lessonFilter || statusFilter) && (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{totalFiltered} resultado(s) encontrado(s)</span>
              <Link href="/admin/aulas-personalizadas" className="inline-flex items-center gap-1 font-semibold text-accent"><X className="size-3.5" /> Limpar filtros</Link>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-background"><BookOpen className="size-5 text-muted" /></span>
              <p className="mt-4 font-semibold text-foreground">Nenhuma geração encontrada</p>
              <p className="mt-1 text-sm text-muted">Quando um aluno gerar uma aula personalizada, a versão aparecerá aqui.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background-secondary text-xs uppercase tracking-wide text-muted">
                  <tr><th className="px-5 py-3">Aluno</th><th className="px-5 py-3">Aula</th><th className="px-5 py-3">Versão</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Créditos</th><th className="px-5 py-3">Data</th><th className="px-5 py-3"><span className="sr-only">Ações</span></th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const status = statusDetails[row.status];
                    return (
                      <tr key={row.id} className="hover:bg-background-secondary/60">
                        <td className="px-5 py-4"><Link href={`/admin/users/${row.userId}`} className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-soft-foreground">{initials(row.studentName)}</span><span><span className="block font-semibold text-foreground">{row.studentName}</span><span className="block text-xs text-muted">{row.studentEmail || row.userId}</span></span></Link></td>
                        <td className="px-5 py-4"><span className="block font-medium text-foreground">{row.lessonTitle}</span><span className="block text-xs text-muted">{row.courseTitle}</span></td>
                        <td className="px-5 py-4"><span className="font-semibold text-foreground">v{row.version}</span><span className="block text-xs text-muted">revisão {row.revision}</span></td>
                        <td className="px-5 py-4"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></td>
                        <td className="px-5 py-4 font-medium text-foreground">{formatAiCredits(row.credits)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-muted">{formatDate(row.finishedAt ?? row.createdAt)}</td>
                        <td className="px-5 py-4 text-right"><Link href={`${historyHref(currentQuery, { generation: row.id })}#conteudo-gerado`} className="font-semibold text-accent hover:underline">Ver conteúdo</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {rows.map((row) => {
                const status = statusDetails[row.status];
                return (
                  <li key={row.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-foreground">{row.studentName}</p><p className="text-xs text-muted">{row.studentEmail || row.userId}</p></div><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div>
                    <div><p className="text-sm font-medium text-foreground">{row.lessonTitle}</p><p className="text-xs text-muted">{row.courseTitle} · versão {row.version} · revisão {row.revision}</p></div>
                    <div className="flex items-center justify-between text-xs text-muted"><span>{formatDate(row.finishedAt ?? row.createdAt)}</span><span>{formatAiCredits(row.credits)} créditos</span></div>
                    <Link href={`${historyHref(currentQuery, { generation: row.id })}#conteudo-gerado`} className="block rounded-lg border border-border px-3 py-2 text-center text-sm font-semibold text-accent">Ver conteúdo</Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-between border-t border-border px-4 py-4" aria-label="Paginação do histórico">
            <p className="text-xs text-muted">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Link aria-disabled={page <= 1} href={historyHref(currentQuery, { page: Math.max(1, page - 1), generation: null })} className={`inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-background"}`}><ChevronLeft className="size-4" /> Anterior</Link>
              <Link aria-disabled={page >= totalPages} href={historyHref(currentQuery, { page: Math.min(totalPages, page + 1), generation: null })} className={`inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-background"}`}>Próxima <ChevronRight className="size-4" /></Link>
            </div>
          </nav>
        )}
      </section>

      {selected && selectedRaw && (
        <section id="conteudo-gerado" className="overflow-hidden rounded-2xl border border-accent/25 bg-surface shadow-sm">
          <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2"><p className="eyebrow">Conteúdo auditável</p>{selectedIsActive && <StatusBadge tone="primary">Versão ativa do aluno</StatusBadge>}</div>
              <h2 className="mt-2 font-display text-2xl font-bold text-foreground">{selected.lessonTitle} · versão {selected.version}</h2>
              <p className="mt-1 text-sm text-muted">{selected.studentName} · {selected.courseTitle}</p>
            </div>
            <Link href={historyHref(currentQuery, { generation: null })} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-background"><X className="size-4" /> Fechar detalhe</Link>
          </header>

          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-surface p-4"><p className="text-xs text-muted">Status</p><div className="mt-2"><StatusBadge tone={statusDetails[selected.status].tone}>{statusDetails[selected.status].label}</StatusBadge></div></div>
            <div className="bg-surface p-4"><p className="text-xs text-muted">Modelo</p><p className="mt-2 break-all text-sm font-semibold text-foreground">{selected.model}</p></div>
            <div className="bg-surface p-4"><p className="text-xs text-muted">Cobrança efetiva</p><p className="mt-2 text-sm font-semibold text-foreground">{formatAiCredits(selected.credits)} créditos</p></div>
            <div className="bg-surface p-4"><p className="text-xs text-muted">Finalização</p><p className="mt-2 text-sm font-semibold text-foreground">{formatDate(selected.finishedAt)}</p></div>
          </div>

          {selected.status === "ready" ? (
            <article className="px-5 py-7 sm:px-8"><AgentMarkdown text={String(selectedRaw.content_markdown ?? "")} /></article>
          ) : (
            <div className="p-6"><div className="rounded-xl bg-background p-4"><p className="font-semibold text-foreground">Esta tentativa não possui conteúdo concluído.</p><p className="mt-1 text-sm text-muted">Código registrado: {selected.errorCode ?? "não informado"}</p></div></div>
          )}

          <div className="grid gap-6 border-t border-border bg-background-secondary/50 p-5 lg:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><Coins className="size-4 text-accent" /> Auditoria financeira</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted">Evento</dt><dd className="mt-1 font-medium text-foreground">{selectedUsage ? String(selectedUsage.status) : "Sem reserva"}</dd></div>
                <div><dt className="text-xs text-muted">Reserva</dt><dd className="mt-1 font-medium text-foreground">{formatAiCredits(Number(selectedUsage?.reservation_credits) || 0)}</dd></div>
                <div><dt className="text-xs text-muted">Tokens de entrada</dt><dd className="mt-1 font-medium text-foreground">{Number(selectedUsage?.prompt_tokens ?? 0).toLocaleString("pt-BR")}</dd></div>
                <div><dt className="text-xs text-muted">Tokens de saída</dt><dd className="mt-1 font-medium text-foreground">{Number(selectedUsage?.completion_tokens ?? 0).toLocaleString("pt-BR")}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><FileText className="size-4 text-accent" /> Fontes incluídas ({sourceManifest.length})</h3>
              {sourceManifest.length ? <ul className="mt-3 space-y-2 text-sm">{sourceManifest.map((source, index) => <li key={`${String(source.id)}-${index}`} className="rounded-lg border border-border bg-surface px-3 py-2"><span className="font-medium text-foreground">{String(source.title ?? source.id ?? "Fonte")}</span><span className="ml-2 text-xs text-muted">{Number(source.characters ?? 0).toLocaleString("pt-BR")} caracteres{source.truncated ? " · truncada" : ""}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">Nenhuma fonte complementar foi registrada.</p>}
            </div>
          </div>

          <footer className="border-t border-border px-5 py-4 text-xs text-muted">
            Assistente: {selected.assistantName} · revisão {selected.revision} · assinatura <code>{String(selectedRaw.input_signature ?? "").slice(0, 16)}…</code> · ID {selected.id}
          </footer>
        </section>
      )}
    </div>
  );
}
