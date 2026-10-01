import { LearningTrail, Question, SessionFeedback, SessionLoadRating, StudyAvailability } from '@/types/trilha';
import { weeklyMinutes } from '@/lib/matching';

export type TrailAnalyticsEventType =
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'plan_generated'
  | 'trail_replanned'
  | 'trail_expanded'
  | 'routine_adjusted'
  | 'routine_eased'
  | 'session_postponed'
  | 'content_postponed'
  | 'session_feedback'
  | 'content_removed'
  | 'content_restored'
  | 'content_completed';

export type TrailAnalyticsEvent = {
  id: string;
  type: TrailAnalyticsEventType;
  occurredAt: string;
  /** Presente nas leituras do admin; é o que permite contar pessoas em vez de cliques. */
  userId?: string;
  payload?: Record<string, string | number | boolean>;
};

export type TrailAnalyticsData = {
  formatVersion: 1;
  events: TrailAnalyticsEvent[];
};

export type TrailFunnelStep = {
  key: string;
  label: string;
  /** Pessoas distintas que chegaram até aqui. */
  users: number;
  /** Fatia de quem abriu o onboarding, 0–100. */
  reachRate: number;
  /** Quem chegou aqui e não chegou à etapa seguinte, 0–100. */
  dropRate: number;
};

/**
 * Uma trilha resumida pelo banco (`admin_trail_snapshots`).
 *
 * O painel não precisa dos itens — só dos totais, da data prevista para o fim e
 * do que o aluno declarou. Baixar `trail_data` inteiro custava 30–50 KB por aluno.
 */
export type TrailSnapshot = {
  userId: string;
  name: string | null;
  questionnaireVersion: number | null;
  answers: Record<string, string[]>;
  availability: StudyAvailability | null;
  feedbackHistory: SessionFeedback[];
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  pendingMinutes: number;
  /** Último dia agendado do que falta (`YYYY-MM-DD`); `null` sem pendências ou sem agenda. */
  projectedEndDate: string | null;
};

export type TrailAnswerBreakdown = {
  questionId: string;
  text: string;
  type: Question['type'];
  respondents: number;
  options: Array<{
    label: string;
    count: number;
    share: number;
    /** Tempo médio até concluir a trilha de quem escolheu a opção — revela mapeamentos pesados. */
    averageDaysToFinish: number | null;
  }>;
  /** Respostas a opções que não existem mais na versão publicada. */
  legacyAnswers: number;
};

export type TrailDurationRow = {
  userId: string;
  name: string | null;
  pendingItems: number;
  pendingHours: number;
  /** Rotina que o aluno declarou. */
  weeklyMinutes: number;
  /**
   * Ritmo que a agenda realmente pratica até o fim previsto. Fica bem abaixo do
   * declarado quando o motor aliviou a carga depois de dias em branco.
   */
  scheduledWeeklyMinutes: number;
  projectedEndDate: string;
  daysToFinish: number;
};

export type TrailHealthAlert = {
  id: string;
  tone: 'danger' | 'warning';
  title: string;
  detail: string;
  /** Onde agir: uma pergunta no editor ou uma seção desta aba. */
  target?: { kind: 'question'; questionId: string } | { kind: 'section'; id: 'duracao' | 'funil' | 'carga' };
};

export type TrailHealthSummary = {
  studentsWithTrail: number;
  onboarding: { starters: number; completers: number; completionRate: number };
  funnel: TrailFunnelStep[];
  learners: { active: number; activeRate: number; completedContents: number };
  progress: { completedItems: number; totalItems: number; rate: number };
  replans: { students: number; rate: number; adjustments: number };
  routine: { averageSessionMinutes: number; averageWeekdays: number; averageWeeklyMinutes: number };
  duration: {
    /** Mediana dos dias até o fim previsto, entre as trilhas que ainda têm pendências. */
    medianDays: number | null;
    longThresholdDays: number;
    longCount: number;
    finishedCount: number;
    buckets: Array<{ key: string; label: string; count: number }>;
    longest: TrailDurationRow[];
  };
  feedback: {
    total: number;
    counts: Record<SessionLoadRating, number>;
    /** Média do que foi de fato estudado nas sessões avaliadas como leves ou adequadas. */
    averageSupportedMinutes: number;
  };
  answers: TrailAnswerBreakdown[];
  postponedContents: Array<{ id: string; title: string; count: number; users: number }>;
  /** O que pede ação, do mais grave para o mais leve. */
  alerts: TrailHealthAlert[];
};

export type TrailHealthInput = {
  events: TrailAnalyticsEvent[];
  trails: TrailSnapshot[];
  /** Versão publicada — dá a ordem do funil e as opções da distribuição de respostas. */
  questions: Question[];
  /** Início do período; o feedback guardado na trilha é filtrado por ele. `null` = todo o histórico. */
  since?: Date | null;
  /** Referência para "dias até concluir"; padrão: agora. */
  today?: Date;
};

/**
 * O mesmo retrato que `admin_trail_snapshots` monta no banco, a partir da trilha
 * inteira. Serve de reserva para bancos sem a função (ambiente local, branches).
 */
export function snapshotFromTrail(trail: LearningTrail, name: string | null = null): TrailSnapshot {
  const pending = trail.items.filter((item) => item.status !== 'completed');
  const dates = pending.map((item) => item.scheduledDate).filter(Boolean).sort();
  return {
    userId: trail.userId,
    name,
    questionnaireVersion: trail.questionnaireVersion ?? null,
    answers: trail.answers ?? {},
    availability: trail.availability ?? null,
    feedbackHistory: trail.feedbackHistory ?? [],
    totalItems: trail.items.length,
    completedItems: trail.items.length - pending.length,
    pendingItems: pending.length,
    pendingMinutes: pending.reduce((sum, item) => sum + (Number(item.durationMin) || 0), 0),
    projectedEndDate: dates.at(-1) ?? null,
  };
}

/** Acima disso a trilha conta como longa — três meses é o horizonte que alguém sustenta sem rever o plano. */
export const LONG_TRAIL_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(dateKey: string, today: Date): number | null {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  const end = Date.UTC(year, month - 1, day);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/** "jan. de 2028" — para os textos dos alertas. */
export function formatMonthYear(dateKey: string): string {
  const [year, month] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

/** "12 dias", "2,4 meses", "1,3 ano". */
export function formatDuration(days: number): string {
  if (days < 45) return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  const months = days / 30.4;
  if (months < 12) return `${months.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses`;
  const years = days / 365;
  return `${years.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${years < 2 ? 'ano' : 'anos'}`;
}

const REPLAN_TYPES = new Set<TrailAnalyticsEventType>([
  'trail_replanned', 'routine_adjusted', 'routine_eased', 'session_postponed',
]);

const percent = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);

/** Evento sem `userId` (testes, dados antigos) vale como uma pessoa à parte. */
const personOf = (event: TrailAnalyticsEvent) => event.userId ?? `anon:${event.id}`;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Casa o rótulo gravado num evento antigo com a pergunta publicada.
 *
 * Até setembro o evento guardava só o texto já interpolado ("Qual seu cargo
 * atual Nohan?") e a posição da etapa — que muda a cada versão do questionário.
 * Transformar `{{nome}}` em curinga deixa esses eventos caírem na pergunta certa
 * em vez de virarem uma linha por aluno no funil.
 */
function buildQuestionMatcher(questions: Question[]) {
  const patterns = questions.map((question, index) => {
    const source = question.text
      .trim()
      .split(/\{\{\s*[\w.]+\s*\}\}/)
      .map(escapeRegExp)
      .join('.*?');
    return { index, regex: new RegExp(`^${source}$`, 'i') };
  });
  const byId = new Map(questions.map((question, index) => [question.id, index]));

  return (event: TrailAnalyticsEvent): number | null => {
    const questionId = event.payload?.questionId;
    if (typeof questionId === 'string' && byId.has(questionId)) return byId.get(questionId)!;
    const label = String(event.payload?.label ?? '').trim();
    if (!label) return null;
    return patterns.find((pattern) => pattern.regex.test(label))?.index ?? null;
  };
}

export function summarizeTrailHealth({ events, trails, questions, since = null, today = new Date() }: TrailHealthInput): TrailHealthSummary {
  const usersOf = (predicate: (event: TrailAnalyticsEvent) => boolean) =>
    new Set(events.filter(predicate).map(personOf));

  // Onboarding — por pessoa: quem recarrega a página não conta duas vezes.
  const starters = usersOf((event) => event.type === 'onboarding_started');
  // `plan_generated` com `reason: refinement` é a recalibração da home, não um onboarding.
  const completers = usersOf((event) => event.type === 'plan_generated' && event.payload?.reason !== 'refinement');

  const matchQuestion = buildQuestionMatcher(questions);
  const reachedByQuestion = questions.map(() => new Set<string>());
  events.forEach((event) => {
    if (event.type !== 'onboarding_step_viewed') return;
    const index = matchQuestion(event);
    if (index !== null) reachedByQuestion[index].add(personOf(event));
  });

  /*
   * O questionário é linear: quem viu a etapa 4 passou pela 1, 2 e 3, e quem
   * gerou a trilha passou por todas. Acumular de trás para frente deixa o funil
   * coerente mesmo quando uma pergunta mudou de texto entre versões e os eventos
   * antigos dela não casam com a publicada.
   */
  const cumulative = new Set(completers);
  for (let index = questions.length - 1; index >= 0; index -= 1) {
    reachedByQuestion[index].forEach((person) => cumulative.add(person));
    reachedByQuestion[index] = new Set(cumulative);
  }
  // Quem respondeu ou gerou a trilha passou pela abertura, mesmo com o início fora do período.
  const openedCount = new Set([...starters, ...cumulative]).size;

  const funnelRows = [
    { key: 'opened', label: 'Abriu o onboarding', users: openedCount },
    ...questions.map((question, index) => ({
      key: question.id,
      label: question.text,
      users: reachedByQuestion[index].size,
    })),
    { key: 'generated', label: 'Gerou a trilha', users: completers.size },
  ];
  const funnel: TrailFunnelStep[] = openedCount === 0 ? [] : funnelRows.map((row, index) => {
    const next = funnelRows[index + 1];
    return {
      ...row,
      reachRate: percent(row.users, openedCount),
      dropRate: next && row.users > 0 ? Math.max(0, Math.round(((row.users - next.users) / row.users) * 100)) : 0,
    };
  });

  // Estudo no período.
  const completedEvents = events.filter((event) => event.type === 'content_completed');
  const activeLearners = new Set(completedEvents.map(personOf));
  const trailOwners = new Set(trails.map((trail) => trail.userId));

  // Progresso — retrato atual das trilhas, independente do período.
  const completedItems = trails.reduce((sum, trail) => sum + trail.completedItems, 0);
  const totalItems = trails.reduce((sum, trail) => sum + trail.totalItems, 0);

  // Replanejamento: um ajuste por pessoa, tipo e dia — a home e o servidor podem registrar o mesmo.
  const replanEvents = events.filter((event) => REPLAN_TYPES.has(event.type));
  const replanStudents = new Set(replanEvents.map(personOf));
  const adjustments = new Set(replanEvents.map((event) => `${personOf(event)}|${event.type}|${event.occurredAt.slice(0, 10)}`)).size;

  // Rotina declarada.
  const availabilities = trails
    .map((trail) => trail.availability)
    .filter((value): value is StudyAvailability => Boolean(value?.weekdays?.length));
  const average = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);
  const routine = {
    averageSessionMinutes: average(availabilities.map((value) => value.minutesPerSession)),
    averageWeekdays: availabilities.length
      ? Math.round((availabilities.reduce((sum, value) => sum + value.weekdays.length, 0) / availabilities.length) * 10) / 10
      : 0,
    averageWeeklyMinutes: average(availabilities.map((value) => weeklyMinutes(value))),
  };

  // Duração — quanto falta, pela agenda que o próprio motor montou.
  const daysByUser = new Map<string, number>();
  const durationRows: TrailDurationRow[] = [];
  trails.forEach((trail) => {
    if (trail.pendingItems === 0 || !trail.projectedEndDate) return;
    const days = daysUntil(trail.projectedEndDate, today);
    if (days === null) return;
    daysByUser.set(trail.userId, days);
    durationRows.push({
      userId: trail.userId,
      name: trail.name,
      pendingItems: trail.pendingItems,
      pendingHours: Math.round((trail.pendingMinutes / 60) * 10) / 10,
      weeklyMinutes: trail.availability?.weekdays?.length ? weeklyMinutes(trail.availability) : 0,
      scheduledWeeklyMinutes: Math.round(trail.pendingMinutes / Math.max(1, days / 7)),
      projectedEndDate: trail.projectedEndDate,
      daysToFinish: days,
    });
  });
  durationRows.sort((a, b) => b.daysToFinish - a.daysToFinish);
  const allDays = durationRows.map((row) => row.daysToFinish);
  const duration = {
    medianDays: median(allDays),
    longThresholdDays: LONG_TRAIL_DAYS,
    longCount: allDays.filter((days) => days > LONG_TRAIL_DAYS).length,
    finishedCount: trails.filter((trail) => trail.totalItems > 0 && trail.pendingItems === 0).length,
    buckets: [
      { key: '1m', label: 'Até 1 mês', count: allDays.filter((days) => days <= 31).length },
      { key: '3m', label: '1 a 3 meses', count: allDays.filter((days) => days > 31 && days <= LONG_TRAIL_DAYS).length },
      { key: '6m', label: '3 a 6 meses', count: allDays.filter((days) => days > LONG_TRAIL_DAYS && days <= 183).length },
      { key: 'more', label: 'Mais de 6 meses', count: allDays.filter((days) => days > 183).length },
    ],
    longest: durationRows.slice(0, 5),
  };

  // Feedback de carga — guardado na própria trilha, filtrado pelo período.
  const feedback = trails
    .flatMap((trail) => trail.feedbackHistory || [])
    .filter((item) => !since || new Date(item.submittedAt) >= since);
  const feedbackCounts: Record<SessionLoadRating, number> = { light: 0, right: 0, heavy: 0 };
  feedback.forEach((item) => { if (item.rating in feedbackCounts) feedbackCounts[item.rating] += 1; });
  const supported = feedback.filter((item) => item.rating !== 'heavy' && item.completedMinutes > 0);

  // Distribuição de respostas da versão publicada.
  const answers: TrailAnswerBreakdown[] = questions
    .filter((question) => question.type !== 'availability')
    .map((question) => {
      const responses = trails
        .map((trail) => ({ userId: trail.userId, values: trail.answers?.[question.id] }))
        .filter((entry): entry is { userId: string; values: string[] } =>
          Array.isArray(entry.values) && entry.values.some((value) => value?.trim()));
      const chosenBy = new Map(question.options.map((option) => [option.label, [] as string[]]));
      let legacyAnswers = 0;
      if (question.type !== 'open') {
        responses.forEach(({ userId, values }) => values.forEach((value) => {
          const people = chosenBy.get(value);
          if (people) people.push(userId);
          else legacyAnswers += 1;
        }));
      }
      return {
        questionId: question.id,
        text: question.text,
        type: question.type,
        respondents: responses.length,
        options: [...chosenBy.entries()].map(([label, people]) => {
          const days = people.map((userId) => daysByUser.get(userId)).filter((value): value is number => value !== undefined);
          return {
            label,
            count: people.length,
            share: percent(people.length, responses.length),
            averageDaysToFinish: days.length ? average(days) : null,
          };
        }),
        legacyAnswers,
      };
    });

  // Conteúdos mais adiados — o título vem no próprio evento.
  const postponed = new Map<string, { id: string; title: string; count: number; people: Set<string> }>();
  events.filter((event) => event.type === 'content_postponed').forEach((event) => {
    const id = String(event.payload?.itemId ?? event.payload?.contentId ?? '');
    if (!id) return;
    const current = postponed.get(id) ?? {
      id,
      title: String(event.payload?.title ?? 'Conteúdo sem título registrado'),
      count: 0,
      people: new Set<string>(),
    };
    current.count += 1;
    current.people.add(personOf(event));
    postponed.set(id, current);
  });

  const learners = {
    active: activeLearners.size,
    activeRate: percent([...activeLearners].filter((id) => trailOwners.has(id)).length, trails.length),
    completedContents: completedEvents.length,
  };

  // O que pede ação.
  const alerts: TrailHealthAlert[] = [];
  if (duration.longCount > 0) {
    const longest = duration.longest[0];
    alerts.push({
      id: 'long-trails',
      tone: duration.longCount * 2 >= durationRows.length ? 'danger' : 'warning',
      title: `${duration.longCount} de ${durationRows.length} ${durationRows.length === 1 ? 'trilha leva' : 'trilhas levam'} mais de 3 meses para terminar`,
      detail: longest.weeklyMinutes > 0 && longest.scheduledWeeklyMinutes < longest.weeklyMinutes * 0.75
        ? `A mais longa só termina em ${formatMonthYear(longest.projectedEndDate)}: o motor aliviou a carga depois de dias sem estudo e a agenda roda a ~${longest.scheduledWeeklyMinutes} min/semana, contra ${longest.weeklyMinutes} declarados.`
        : `A mais longa só termina em ${formatMonthYear(longest.projectedEndDate)}, com ${longest.pendingItems} conteúdos pendentes. Trilha longa demais desanima: revise as opções que mapeiam mais conteúdo.`,
      target: { kind: 'section', id: 'duracao' },
    });
  }
  const worstStep = funnel
    .slice(1, -1)
    .filter((step) => step.users >= 3 && step.dropRate >= 30)
    .sort((a, b) => b.dropRate - a.dropRate)[0];
  if (worstStep) {
    alerts.push({
      id: 'funnel-drop',
      tone: worstStep.dropRate >= 50 ? 'danger' : 'warning',
      title: `${worstStep.dropRate}% param na pergunta “${worstStep.label}”`,
      detail: 'É a etapa com mais abandono do onboarding. Uma pergunta mais curta, com menos opções, costuma resolver.',
      target: { kind: 'question', questionId: worstStep.key },
    });
  }
  if (feedback.length >= 5 && feedbackCounts.heavy / feedback.length >= 0.4) {
    alerts.push({
      id: 'heavy-load',
      tone: 'warning',
      title: `${percent(feedbackCounts.heavy, feedback.length)}% das sessões avaliadas foram pesadas`,
      detail: 'A carga planejada está acima do que os alunos sustentam. Vale rever a duração dos conteúdos mapeados.',
      target: { kind: 'section', id: 'carga' },
    });
  }
  if (trails.length >= 5 && learners.activeRate < 30) {
    alerts.push({
      id: 'low-activity',
      tone: 'warning',
      title: `Só ${learners.activeRate}% dos alunos com trilha concluíram algo no período`,
      detail: 'A maioria gerou a trilha e não voltou. Confira se o primeiro conteúdo da agenda é curto e direto.',
    });
  }
  alerts.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'danger' ? -1 : 1));

  return {
    studentsWithTrail: trails.length,
    onboarding: { starters: openedCount, completers: completers.size, completionRate: percent(completers.size, openedCount) },
    funnel,
    learners,
    progress: { completedItems, totalItems, rate: percent(completedItems, totalItems) },
    replans: { students: replanStudents.size, rate: percent(replanStudents.size, trails.length), adjustments },
    routine,
    duration,
    feedback: {
      total: feedback.length,
      counts: feedbackCounts,
      averageSupportedMinutes: average(supported.map((item) => item.completedMinutes)),
    },
    answers,
    postponedContents: [...postponed.values()]
      .map(({ people, ...item }) => ({ ...item, users: people.size }))
      .sort((a, b) => b.count - a.count),
    alerts,
  };
}

/**
 * Registra um evento da trilha a partir do navegador.
 *
 * Antes isto só gravava no `localStorage` do aluno — feedback de carga, rotina
 * ajustada e sessões adiadas nunca chegavam ao painel do admin. Agora vai para
 * `trail_events` pela action, carregada sob demanda para este módulo continuar
 * importável em testes e no servidor.
 */
export function recordTrailEvent(
  type: TrailAnalyticsEventType,
  payload?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') return;
  import('@/app/actions/trail')
    .then(({ trackTrailEvent }) => trackTrailEvent(type, payload))
    .catch((err) => console.error('Erro ao registrar evento de analytics da trilha:', err));
}
