'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Card, ProgressBar, Skeleton } from '@heroui/react';
import {
  AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Clock3, GraduationCap, ListChecks, Loader2,
  MessageSquareText, OctagonAlert, RefreshCw, TriangleAlert,
} from 'lucide-react';
import type { Question } from '@/types/trilha';
import type { AdminTrailDiagnostic } from '@/lib/adminTrailDiagnostics';
import {
  formatDuration, formatMonthYear, summarizeTrailHealth,
  type TrailAnalyticsEvent, type TrailHealthAlert, type TrailSnapshot,
} from '@/lib/trailAnalytics';
import { getAdminTrailAnalytics } from '@/app/actions/trail';
import { ANALYTICS_PERIOD_LABELS, type AnalyticsPeriod } from '@/lib/analytics';
import { PeriodSelector } from '@/components/admin/analytics/AnalyticsComponents';
import { AdminEmptyState, StatCard } from '@/components/ui/editorial';
import { cn } from '@/lib/utils';

type BarColor = 'accent' | 'success' | 'warning' | 'danger' | 'default';

/** `ProgressBar` do HeroUI é composto — sem Track/Fill a barra não aparece. */
function Bar({ value, color = 'accent', label }: { value: number; color?: BarColor; label: string }) {
  return (
    <ProgressBar aria-label={label} value={Math.max(0, Math.min(100, value))} color={color} size="sm" className="w-full">
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

function SectionHeading({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-extrabold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-muted">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

const SEVERITY_STYLES: Record<AdminTrailDiagnostic['severity'], { box: string; icon: string; label: string }> = {
  error: { box: 'border-danger/25 bg-danger/5', icon: 'text-danger', label: 'Erro' },
  warning: { box: 'border-warning/25 bg-warning/5', icon: 'text-warning', label: 'Atenção' },
  info: { box: 'border-accent/20 bg-accent/5', icon: 'text-accent', label: 'Sugestão' },
};

const FEEDBACK_ROWS = [
  { key: 'light', label: 'Leve', color: 'accent' },
  { key: 'right', label: 'Adequada', color: 'success' },
  { key: 'heavy', label: 'Pesada', color: 'danger' },
] as const;

const BUCKET_COLORS: Record<string, BarColor> = { '1m': 'success', '3m': 'accent', '6m': 'warning', more: 'danger' };

type LoadedData = {
  events: TrailAnalyticsEvent[];
  trails: TrailSnapshot[];
  since: string | null;
  generatedAt: string;
};

interface TrailHealthPanelProps {
  /** Versão publicada; sem publicação, o rascunho serve de referência. */
  questions: Question[];
  isUsingDraft: boolean;
  diagnostics: AdminTrailDiagnostic[];
  onOpenQuestion: (questionId: string) => void;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function AlertList({ alerts, onOpenQuestion }: { alerts: TrailHealthAlert[]; onOpenQuestion: (questionId: string) => void }) {
  if (alerts.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
        <CheckCircle2 size={16} /> Nenhum sinal de alerta nos resultados deste período.
      </p>
    );
  }

  return (
    <section aria-labelledby="trail-health-alerts" className="space-y-2">
      <h3 id="trail-health-alerts" className="eyebrow">Pede atenção</h3>
      <ul className="space-y-2">
        {alerts.map((alert) => {
          const danger = alert.tone === 'danger';
          const Icon = danger ? OctagonAlert : TriangleAlert;
          const target = alert.target;
          return (
            <li
              key={alert.id}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between',
                danger ? 'border-danger/25 bg-danger/5' : 'border-warning/30 bg-warning/5',
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <Icon className={cn('mt-0.5 size-5 shrink-0', danger ? 'text-danger' : 'text-warning')} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{alert.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted">{alert.detail}</p>
                </div>
              </div>
              {target && (
                <button
                  type="button"
                  onClick={() => (target.kind === 'question' ? onOpenQuestion(target.questionId) : scrollToSection(target.id))}
                  className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-surface-hover sm:self-center"
                >
                  {target.kind === 'question' ? 'Editar pergunta' : 'Ver detalhes'} <ArrowRight size={13} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const SEVERITY_ORDER: Record<AdminTrailDiagnostic['severity'], number> = { error: 0, warning: 1, info: 2 };
const GROUP_PREVIEW = 3;

/**
 * Diagnósticos agrupados por tipo.
 *
 * Um catálogo desatualizado gera dezenas de "Conteúdo não encontrado" — um
 * cartão para cada empurrava o resto da aba para longe. Agrupado, o admin vê
 * de cara quantos tipos de problema existem e abre só o que vai tratar.
 */
function CurationDiagnostics({ diagnostics, onOpenQuestion }: { diagnostics: AdminTrailDiagnostic[]; onOpenQuestion: (questionId: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; severity: AdminTrailDiagnostic['severity']; title: string; items: AdminTrailDiagnostic[] }>();
    diagnostics.forEach((item) => {
      const key = `${item.severity}:${item.title}`;
      const group = map.get(key) ?? { key, severity: item.severity, title: item.title, items: [] };
      group.items.push(item);
      map.set(key, group);
    });
    return [...map.values()].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.items.length - a.items.length);
  }, [diagnostics]);

  return (
    <ul className="space-y-3">
      {groups.map((group) => {
        const style = SEVERITY_STYLES[group.severity];
        const isExpanded = expanded[group.key] ?? false;
        const visible = isExpanded ? group.items : group.items.slice(0, GROUP_PREVIEW);
        return (
          <li key={group.key} className={cn('rounded-lg border p-4', style.box)}>
            <div className="flex items-start gap-3">
              <TriangleAlert className={cn('mt-0.5 size-4 shrink-0', style.icon)} aria-label={style.label} />
              <div className="min-w-0 flex-1">
                <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  {group.title}
                  {group.items.length > 1 && (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-2xs font-bold text-muted">{group.items.length}</span>
                  )}
                </h4>
                <ul className="mt-2 space-y-2">
                  {visible.map((item) => (
                    <li key={item.id} className="text-xs leading-5 text-muted">
                      {item.detail}
                      {item.questionId && (
                        <button
                          type="button"
                          onClick={() => onOpenQuestion(item.questionId!)}
                          className="ml-1.5 inline-flex items-center gap-0.5 font-bold text-accent hover:underline"
                        >
                          Ir para a pergunta <ArrowRight size={11} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {group.items.length > GROUP_PREVIEW && (
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded((current) => ({ ...current, [group.key]: !isExpanded }))}
                    className="mt-2 text-xs font-bold text-foreground hover:underline"
                  >
                    {isExpanded ? 'Mostrar menos' : `Mostrar mais ${group.items.length - GROUP_PREVIEW}`}
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function TrailHealthPanel({ questions, isUsingDraft, diagnostics, onOpenQuestion }: TrailHealthPanelProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [reloadKey, setReloadKey] = useState(0);
  /*
   * A chave da requisição decide o "carregando": enquanto a última resposta não
   * for a do período/recarga atual, a tela mantém os dados anteriores esmaecidos.
   */
  const requestKey = `${period}:${reloadKey}`;
  const [result, setResult] = useState<{ key: string; error?: string } | null>(null);
  const [data, setData] = useState<LoadedData | null>(null);
  const isLoading = result?.key !== requestKey;
  const error = isLoading ? null : result?.error ?? null;

  useEffect(() => {
    let active = true;
    getAdminTrailAnalytics(period)
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          setResult({ key: requestKey, error: res.message || 'Não foi possível carregar os dados.' });
          return;
        }
        setData({ events: res.data.events, trails: res.trails, since: res.since, generatedAt: res.generatedAt });
        setResult({ key: requestKey });
      })
      .catch((err: unknown) => {
        if (active) setResult({ key: requestKey, error: err instanceof Error ? err.message : 'Não foi possível carregar os dados.' });
      });
    return () => { active = false; };
  }, [period, requestKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const summary = useMemo(() => (data
    ? summarizeTrailHealth({
      events: data.events,
      trails: data.trails,
      questions,
      since: data.since ? new Date(data.since) : null,
    })
    : null), [data, questions]);

  const updatedAt = data
    ? new Date(data.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Efetividade</p>
          <h2 className="mt-1 text-2xl font-extrabold text-foreground">Sinais da experiência do aluno</h2>
          <p className="mt-1 text-sm text-muted">
            Eventos dos {ANALYTICS_PERIOD_LABELS[period]}; duração, progresso e respostas são o retrato atual das trilhas.
            {updatedAt && <> Atualizado às {updatedAt}.</>}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <PeriodSelector period={period} onChange={setPeriod} className="hide-scrollbar min-w-0 flex-1 overflow-x-auto sm:flex-none" />
          <button
            type="button"
            onClick={reload}
            disabled={isLoading}
            aria-label="Atualizar dados"
            title="Atualizar dados"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </div>

      {isUsingDraft && (
        <p className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-warning">
          <TriangleAlert size={16} /> Ainda não há questionário publicado — o funil e as respostas usam o rascunho como referência.
        </p>
      )}

      {error ? (
        <Card>
          <AdminEmptyState
            icon={AlertCircle}
            title="Não foi possível carregar os resultados"
            description={error}
            action={(
              <button type="button" onClick={reload} className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground hover:bg-accent-hover">
                Tentar de novo
              </button>
            )}
          />
        </Card>
      ) : !summary ? (
        <div className="space-y-6" aria-busy="true" aria-label="Carregando resultados">
          <Skeleton className="h-20 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : summary.studentsWithTrail === 0 && summary.onboarding.starters === 0 ? (
        <Card>
          <AdminEmptyState
            icon={ListChecks}
            title="Ainda não há resultados"
            description="Assim que os alunos começarem o onboarding, o funil, a duração das trilhas e as respostas aparecem aqui."
          />
        </Card>
      ) : (
        <div className={cn('space-y-6 transition-opacity', isLoading && 'pointer-events-none opacity-60')} aria-busy={isLoading}>
          <AlertList alerts={summary.alerts} onOpenQuestion={onOpenQuestion} />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
            <StatCard
              icon={ListChecks}
              label="Onboarding concluído"
              value={`${summary.onboarding.completionRate}%`}
              helper={`${summary.onboarding.completers} de ${summary.onboarding.starters} ${summary.onboarding.starters === 1 ? 'aluno que abriu' : 'alunos que abriram'}`}
            />
            <StatCard
              icon={GraduationCap}
              tone="sage"
              label="Alunos estudando"
              value={String(summary.learners.active)}
              helper={`${summary.learners.activeRate}% de ${summary.studentsWithTrail} com trilha · ${summary.learners.completedContents} conclusões`}
            />
            <StatCard
              icon={CalendarClock}
              tone={summary.duration.medianDays !== null && summary.duration.medianDays > summary.duration.longThresholdDays ? 'terracotta' : 'neutral'}
              label="Tempo até concluir"
              value={summary.duration.medianDays === null ? '—' : formatDuration(summary.duration.medianDays)}
              helper={summary.duration.longCount > 0
                ? `Mediana · ${summary.duration.longCount} acima de 3 meses`
                : 'Mediana das trilhas em andamento'}
            />
            <StatCard
              icon={RefreshCw}
              tone="terracotta"
              label="Precisaram replanejar"
              value={`${summary.replans.rate}%`}
              helper={`${summary.replans.students} ${summary.replans.students === 1 ? 'aluno' : 'alunos'} · ${summary.replans.adjustments} ajustes`}
            />
          </section>

          <Card id="duracao" className="scroll-mt-24">
            <Card.Content className="space-y-6">
              <SectionHeading
                eyebrow="Duração"
                title="Quanto falta para cada trilha terminar"
                description="Pela agenda que o motor montou para a rotina de cada aluno. Acima de 3 meses o plano costuma ser abandonado antes do fim."
                aside={(
                  <span className="shrink-0 text-right text-xs text-muted">
                    <strong className="text-foreground">{summary.progress.rate}%</strong> concluído
                    <span className="block">{summary.progress.completedItems} de {summary.progress.totalItems} conteúdos</span>
                  </span>
                )}
              />
              <div className="grid gap-6 lg:grid-cols-5">
                <ul className="space-y-3 lg:col-span-2">
                  {summary.duration.buckets.map((bucket) => {
                    const inProgress = summary.duration.buckets.reduce((sum, item) => sum + item.count, 0);
                    const share = inProgress ? Math.round((bucket.count / inProgress) * 100) : 0;
                    return (
                      <li key={bucket.key}>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-semibold text-foreground">{bucket.label}</span>
                          <span className="tabular-nums text-muted"><strong className="text-foreground">{bucket.count}</strong> · {share}%</span>
                        </div>
                        <div className="mt-1.5"><Bar label={`${bucket.label}: ${bucket.count} trilhas`} value={share} color={BUCKET_COLORS[bucket.key]} /></div>
                      </li>
                    );
                  })}
                  {summary.duration.finishedCount > 0 && (
                    <li className="flex items-center gap-2 pt-1 text-xs text-success">
                      <CheckCircle2 size={14} /> {summary.duration.finishedCount} {summary.duration.finishedCount === 1 ? 'trilha concluída' : 'trilhas concluídas'}
                    </li>
                  )}
                </ul>

                <div className="min-w-0 lg:col-span-3">
                  <p className="text-xs font-bold text-muted">Trilhas mais longas</p>
                  {summary.duration.longest.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">Nenhuma trilha em andamento.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-separator">
                      {summary.duration.longest.map((row) => {
                        const isLong = row.daysToFinish > summary.duration.longThresholdDays;
                        return (
                          <li key={row.userId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                            <div className="min-w-0">
                              <Link
                                href={`/admin/users/${row.userId}`}
                                className="block truncate text-sm font-semibold text-foreground hover:text-accent hover:underline"
                              >
                                {row.name || 'Aluno sem nome'}
                              </Link>
                              <p className="text-xs text-muted">
                                {row.pendingItems} conteúdos · {row.pendingHours.toLocaleString('pt-BR')} h pendentes
                                {row.weeklyMinutes > 0 && <> · rotina de {row.weeklyMinutes} min/sem</>}
                              </p>
                              {row.weeklyMinutes > 0 && row.scheduledWeeklyMinutes < row.weeklyMinutes * 0.75 && (
                                <p className="text-2xs font-semibold text-warning" title="O motor reduziu a meta depois de dias sem estudo">
                                  Carga aliviada: a agenda roda a ~{row.scheduledWeeklyMinutes} min/sem
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={cn('text-sm font-extrabold tabular-nums', isLong ? 'text-danger' : 'text-foreground')}>
                                {formatDuration(row.daysToFinish)}
                              </p>
                              <p className="text-2xs text-muted">termina em {formatMonthYear(row.projectedEndDate)}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </Card.Content>
          </Card>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card id="funil" className="min-w-0 scroll-mt-24">
              <Card.Content className="space-y-5">
                <SectionHeading eyebrow="Abandono por etapa" title="Funil do onboarding" />
                {summary.funnel.length === 0 ? (
                  <p className="text-sm text-muted">Ninguém abriu o onboarding neste período.</p>
                ) : (
                  <ol className="space-y-4">
                    {summary.funnel.map((step, index) => {
                      const isQuestion = index > 0 && index < summary.funnel.length - 1;
                      return (
                        <li key={step.key}>
                          <div className="flex items-baseline justify-between gap-3 text-xs">
                            {isQuestion ? (
                              <button
                                type="button"
                                onClick={() => onOpenQuestion(step.key)}
                                className="min-w-0 truncate text-left font-semibold text-foreground hover:text-accent hover:underline"
                                title={`Editar: ${step.label}`}
                              >
                                <span className="text-muted">{index}. </span>{step.label}
                              </button>
                            ) : (
                              <span className="min-w-0 truncate font-semibold text-foreground">{step.label}</span>
                            )}
                            <span className="shrink-0 tabular-nums text-muted">
                              <strong className="text-foreground">{step.users}</strong> · {step.reachRate}%
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <Bar
                              label={`${step.label}: ${step.reachRate}% de quem abriu`}
                              value={step.reachRate}
                              color={index === summary.funnel.length - 1 ? 'success' : 'accent'}
                            />
                          </div>
                          {step.dropRate > 0 && index < summary.funnel.length - 1 && (
                            <p className={cn('mt-1 text-2xs font-semibold', step.dropRate >= 30 ? 'text-danger' : 'text-muted')}>
                              −{step.dropRate}% não seguiram para a próxima etapa
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Card.Content>
            </Card>

            <Card className="min-w-0">
              <Card.Content className="space-y-5">
                <SectionHeading
                  eyebrow="Diagnóstico"
                  title="Saúde da curadoria"
                  aside={<span className="shrink-0 rounded-full bg-background-secondary px-3 py-1 text-xs font-bold text-muted">{diagnostics.length} {diagnostics.length === 1 ? 'sinal' : 'sinais'}</span>}
                />
                {diagnostics.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-4 text-sm text-success">
                    <CheckCircle2 size={19} /> Nenhuma inconsistência encontrada na configuração atual.
                  </div>
                ) : (
                  <CurationDiagnostics diagnostics={diagnostics} onOpenQuestion={onOpenQuestion} />
                )}
              </Card.Content>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-5">
            <Card className="min-w-0 lg:col-span-3">
              <Card.Content className="space-y-5">
                <SectionHeading
                  eyebrow="Respostas"
                  title="Como os alunos responderam"
                  description="Ao lado de cada opção, o tempo médio até concluir a trilha de quem a escolheu — opções que mapeiam conteúdo demais aparecem em vermelho."
                />
                {summary.answers.length === 0 ? (
                  <p className="text-sm text-muted">O questionário ainda não tem perguntas.</p>
                ) : (
                  <div className="space-y-6">
                    {summary.answers.map((question) => (
                      <div key={question.questionId}>
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenQuestion(question.questionId)}
                            className="text-left text-sm font-bold text-foreground hover:text-accent hover:underline"
                          >
                            {question.text}
                          </button>
                          <span className="shrink-0 text-xs text-muted">
                            {question.respondents} {question.respondents === 1 ? 'resposta' : 'respostas'}
                          </span>
                        </div>
                        {question.type === 'open' ? (
                          <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                            <MessageSquareText size={14} /> Pergunta aberta — as respostas alimentam a IA e não entram na distribuição.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-2.5">
                            {question.options.map((option) => {
                              const isLong = option.averageDaysToFinish !== null && option.averageDaysToFinish > summary.duration.longThresholdDays;
                              return (
                                <li key={option.label}>
                                  <div className="flex items-baseline justify-between gap-3 text-xs">
                                    <span className={cn('min-w-0 truncate', option.count === 0 ? 'text-warning' : 'text-muted')} title={option.label}>
                                      {option.label}
                                    </span>
                                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums text-muted">
                                      {option.averageDaysToFinish !== null && (
                                        <span
                                          className={cn('inline-flex items-center gap-1', isLong ? 'font-semibold text-danger' : 'text-muted')}
                                          title="Tempo médio até concluir a trilha de quem escolheu esta opção"
                                        >
                                          <Clock3 size={11} aria-hidden="true" />{formatDuration(option.averageDaysToFinish)}
                                        </span>
                                      )}
                                      {option.count === 0 && question.respondents > 0
                                        ? <span className="font-semibold text-warning">ninguém escolheu</span>
                                        : <span><strong className="text-foreground">{option.count}</strong> · {option.share}%</span>}
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <Bar label={`${option.label}: ${option.share}%`} value={option.share} />
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {question.legacyAnswers > 0 && (
                          <p className="mt-2 text-2xs text-muted">
                            + {question.legacyAnswers} {question.legacyAnswers === 1 ? 'resposta a uma opção' : 'respostas a opções'} que não existe mais nesta versão.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>

            <div className="min-w-0 space-y-6 lg:col-span-2">
              <Card id="carga" className="scroll-mt-24">
                <Card.Content className="space-y-5">
                  <SectionHeading eyebrow="Carga" title="Rotina e feedback das sessões" />
                  <dl className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-background-secondary px-2 py-3">
                      <dt className="text-2xs font-semibold text-muted">Meta por sessão</dt>
                      <dd className="mt-1 text-lg font-extrabold text-foreground">{summary.routine.averageSessionMinutes}<span className="text-xs text-muted"> min</span></dd>
                    </div>
                    <div className="rounded-lg bg-background-secondary px-2 py-3">
                      <dt className="text-2xs font-semibold text-muted">Dias por semana</dt>
                      <dd className="mt-1 text-lg font-extrabold text-foreground">{summary.routine.averageWeekdays.toLocaleString('pt-BR')}</dd>
                    </div>
                    <div className="rounded-lg bg-background-secondary px-2 py-3">
                      <dt className="text-2xs font-semibold text-muted">Carga suportada</dt>
                      <dd className="mt-1 text-lg font-extrabold text-foreground">
                        {summary.feedback.averageSupportedMinutes || '—'}
                        {summary.feedback.averageSupportedMinutes > 0 && <span className="text-xs text-muted"> min</span>}
                      </dd>
                    </div>
                  </dl>
                  {summary.feedback.total === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <Clock3 size={15} /> Nenhuma sessão avaliada neste período.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {FEEDBACK_ROWS.map((row) => {
                        const count = summary.feedback.counts[row.key];
                        const share = Math.round((count / summary.feedback.total) * 100);
                        return (
                          <li key={row.key}>
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-muted">{row.label}</span>
                              <span className="tabular-nums text-muted"><strong className="text-foreground">{count}</strong> · {share}%</span>
                            </div>
                            <div className="mt-1"><Bar label={`Sessões ${row.label.toLowerCase()}: ${share}%`} value={share} color={row.color} /></div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card.Content>
              </Card>

              <Card>
                <Card.Content className="space-y-4">
                  <SectionHeading eyebrow="Atrito" title="Conteúdos mais adiados" />
                  {summary.postponedContents.length === 0 ? (
                    <p className="text-sm text-muted">Nenhum conteúdo foi adiado neste período.</p>
                  ) : (
                    <ul className="space-y-2">
                      {summary.postponedContents.slice(0, 5).map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-background-secondary px-3 py-2 text-sm">
                          <span className="min-w-0 truncate font-semibold text-muted" title={item.title}>{item.title}</span>
                          <span className="shrink-0 text-xs text-muted">
                            <strong className="text-foreground">{item.count}×</strong> · {item.users} {item.users === 1 ? 'aluno' : 'alunos'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card.Content>
              </Card>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
