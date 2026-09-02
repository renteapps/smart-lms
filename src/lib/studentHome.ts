import type { CatalogCourse } from '@/types/course';
import { fromLocalDateKey, minutesForWeekday, normalizeAvailability, toLocalDateKey, weeklyMinutes } from '@/lib/matching';
import type {
  LearningRole,
  LearningTrail,
  LearningTrailItem,
  Questionnaire,
  Weekday,
} from '@/types/trilha';

/**
 * Camada de seleção da home do aluno.
 *
 * Tudo aqui é função pura sobre a `LearningTrail` v3 — a mesma estrutura que o
 * onboarding grava e que /minha-trilha edita. A home antiga lia a mesma chave
 * `minha_trilha` por um segundo caminho, que achatava `status`, `score` e
 * `learningRole`, e por isso mostrava um "próximo passo" diferente do plano
 * real. Existe um leitor só, e é este.
 *
 * Nenhuma função toca `localStorage`: quem lê é o orquestrador cliente, uma vez.
 */

const DAY_IN_MS = 86_400_000;

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

/** Rótulo curto por papel da pergunta — o texto integral é longo demais para um chip. */
const ROLE_LABELS: Record<string, string> = {
  perfil: 'Seu perfil',
  problema: 'O que te trava',
  interesse: 'Quer desenvolver',
  nivel: 'Seu nível',
  restricao: 'Restrição',
  disponibilidade: 'Sua rotina',
};

// ---------------------------------------------------------------------------
// Sessão em foco
// ---------------------------------------------------------------------------

export type HomeSession = {
  sessionId: string;
  dateKey: string;
  date: Date;
  /** 0 = hoje, 1 = amanhã, 2+ = dias à frente. */
  offsetInDays: number;
  items: LearningTrailItem[];
  pending: LearningTrailItem[];
  done: LearningTrailItem[];
  /** Primeiro pendente — a única ação primária da tela. */
  nextStep: LearningTrailItem | null;
  totalMinutes: number;
  remainingMinutes: number;
  /** Só faz sentido para hoje: prever o fim de uma sessão de quinta é ruído. */
  finishesAt: Date | null;
};

export type HomeState =
  | { kind: 'sem-trilha' }
  | { kind: 'sem-agenda'; trail: LearningTrail }
  | { kind: 'dia-pronto'; trail: LearningTrail; session: HomeSession }
  | { kind: 'dia-concluido'; trail: LearningTrail; session: HomeSession; next: HomeSession | null };

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function groupSessions(items: LearningTrailItem[]): LearningTrailItem[][] {
  const groups = new Map<string, LearningTrailItem[]>();

  items.forEach((item) => {
    if (!item.sessionId || !item.scheduledDate) return;
    groups.set(item.sessionId, [...(groups.get(item.sessionId) || []), item]);
  });

  return [...groups.values()]
    .map((sessionItems) => [...sessionItems].sort((a, b) => a.order - b.order))
    .sort((a, b) => (
      a[0].scheduledDate.localeCompare(b[0].scheduledDate)
      || a[0].sessionId.localeCompare(b[0].sessionId)
    ));
}

function buildSession(items: LearningTrailItem[], now: Date): HomeSession {
  const dateKey = items[0].scheduledDate;
  const date = fromLocalDateKey(dateKey);
  const pending = items.filter((item) => item.status === 'pending');
  const done = items.filter((item) => item.status === 'completed');
  const remainingMinutes = pending.reduce((total, item) => total + item.durationMin, 0);
  const offsetInDays = Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_IN_MS,
  );

  return {
    sessionId: items[0].sessionId,
    dateKey,
    date,
    offsetInDays,
    items,
    pending,
    done,
    nextStep: pending[0] ?? null,
    totalMinutes: items.reduce((total, item) => total + item.durationMin, 0),
    remainingMinutes,
    finishesAt: offsetInDays === 0 && remainingMinutes > 0
      ? new Date(now.getTime() + remainingMinutes * 60_000)
      : null,
  };
}

/**
 * Decide o que a home mostra.
 *
 * Dias passados são descartados de propósito: a home responde "o que eu faço
 * agora", e um conteúdo de terça exibido na quinta só gera culpa. O histórico
 * continua inteiro em /minha-trilha, e `replanLearningTrail` já reagenda o que
 * ficou para trás.
 *
 * A sessão de hoje concluída vence uma sessão futura pendente — quem terminou o
 * dia precisa ver que terminou, não a próxima cobrança.
 */
export function selectHomeState(trail: LearningTrail | null, now = new Date()): HomeState {
  if (!trail || trail.items.length === 0) return { kind: 'sem-trilha' };

  const today = toLocalDateKey(now);
  const sessions = groupSessions(trail.items).map((items) => buildSession(items, now));

  const todaySession = sessions.find((session) => session.dateKey === today);
  const upcomingPending = sessions.find(
    (session) => session.dateKey >= today && session.pending.length > 0,
  );

  if (todaySession && todaySession.pending.length === 0) {
    return {
      kind: 'dia-concluido',
      trail,
      session: todaySession,
      next: sessions.find((session) => session.dateKey > today && session.pending.length > 0) ?? null,
    };
  }

  if (upcomingPending) return { kind: 'dia-pronto', trail, session: upcomingPending };

  return { kind: 'sem-agenda', trail };
}

// ---------------------------------------------------------------------------
// Números reais da régua
// ---------------------------------------------------------------------------

export type WeekDayProgress = {
  weekday: Weekday;
  label: string;
  /** Concluiu pelo menos um conteúdo neste dia. */
  done: boolean;
  /** O dia faz parte da rotina escolhida no onboarding. */
  planned: boolean;
  isToday: boolean;
  isFuture: boolean;
};

export type StudyStats = {
  weekGoalDays: number;
  /** Soma real da semana: no modo por dia, cada dia com o seu tempo. */
  weekGoalMinutes: number;
  weekDoneDays: number;
  weekDays: WeekDayProgress[];
  streakDays: number;
  minutesLast30Days: number;
  completedCount: number;
  totalCount: number;
  completionRate: number;
};

/** Segunda-feira como início da semana, como no resto do produto. */
export function getWeekBounds(date = new Date()) {
  const start = startOfDay(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

function completionDayKeys(trail: LearningTrail): Set<string> {
  const keys = new Set<string>();

  trail.items.forEach((item) => {
    if (item.status !== 'completed') return;
    // `completedAt` é ISO; `scheduledDate` já é uma chave local. Preferir o real.
    if (item.completedAt) {
      const parsed = new Date(item.completedAt);
      if (!Number.isNaN(parsed.getTime())) {
        keys.add(toLocalDateKey(parsed));
        return;
      }
    }
    if (item.scheduledDate) keys.add(item.scheduledDate);
  });

  return keys;
}

/**
 * Sequência de estudo.
 *
 * Conta dias para trás, mas um dia vazio só quebra a sequência se ele fizer
 * parte da rotina escolhida: quem estuda Seg/Qua/Sex não deve perder a sequência
 * por não ter estudado no domingo. O dia de hoje nunca quebra — ainda não acabou.
 */
function computeStreak(trail: LearningTrail, now: Date): number {
  const days = completionDayKeys(trail);
  if (days.size === 0) return 0;

  const planned = new Set(
    trail.availability.weekdays.length > 0 ? trail.availability.weekdays : [0, 1, 2, 3, 4, 5, 6],
  );

  let streak = 0;
  const cursor = startOfDay(now);

  // Limite de segurança: um ano para trás é mais do que qualquer trilha real.
  for (let step = 0; step < 366; step += 1) {
    if (days.has(toLocalDateKey(cursor))) {
      streak += 1;
    } else if (step > 0 && planned.has(cursor.getDay() as Weekday)) {
      // Dia de rotina sem estudo quebra a sequência. O passo 0 é hoje, que
      // ainda não acabou e por isso nunca quebra.
      break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function computeStudyStats(trail: LearningTrail, now = new Date()): StudyStats {
  const { start } = getWeekBounds(now);
  const days = completionDayKeys(trail);
  const plannedWeekdays = new Set(trail.availability.weekdays);
  const todayKey = toLocalDateKey(now);

  const weekDays: WeekDayProgress[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const key = toLocalDateKey(date);
    const weekday = date.getDay() as Weekday;

    return {
      weekday,
      label: WEEKDAY_LABELS[weekday],
      done: days.has(key),
      planned: plannedWeekdays.has(weekday),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });

  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_IN_MS);
  const minutesLast30Days = trail.items.reduce((total, item) => {
    if (item.status !== 'completed' || !item.completedAt) return total;
    const completedAt = new Date(item.completedAt);
    if (Number.isNaN(completedAt.getTime()) || completedAt < thirtyDaysAgo) return total;
    return total + item.durationMin;
  }, 0);

  const completedCount = trail.items.filter((item) => item.status === 'completed').length;

  return {
    // A meta é a rotina que a pessoa escolheu, não uma constante do produto.
    weekGoalDays: trail.availability.weekdays.length,
    weekGoalMinutes: weeklyMinutes(trail.availability),
    weekDoneDays: weekDays.filter((day) => day.done).length,
    weekDays,
    streakDays: computeStreak(trail, now),
    minutesLast30Days,
    completedCount,
    totalCount: trail.items.length,
    completionRate: trail.items.length
      ? Math.round((completedCount / trail.items.length) * 100)
      : 0,
  };
}

// ---------------------------------------------------------------------------
// "Por que sua trilha é assim"
// ---------------------------------------------------------------------------

export type ProfileChip = {
  id: string;
  label: string;
  values: string[];
};

/**
 * Traduz as respostas do onboarding em chips legíveis.
 *
 * `trail.answers` é indexado pelo **texto** da opção, não pelo id — renomear uma
 * opção no admin órfã as respostas salvas. Por isso nada aqui faz lookup no
 * questionário para exibir o valor: o texto guardado é exibido como está, e
 * perguntas que sumiram do questionário continuam aparecendo com seu rótulo
 * genérico em vez de derrubar o bloco.
 */
export function deriveProfileSummary(
  trail: LearningTrail,
  questionnaire?: Questionnaire | null,
): ProfileChip[] {
  const known = new Map(
    (questionnaire?.questions || []).map((question) => [question.id, question]),
  );

  /*
   * Perguntas de papéis repetidos (o questionário padrão tem duas de `perfil`)
   * viram um chip só. Dois blocos com o mesmo rótulo e valores diferentes leem
   * como erro de dados, não como duas facetas do mesmo perfil.
   */
  const byLabel = new Map<string, ProfileChip>();

  Object.entries(trail.answers || {}).forEach(([questionId, values]) => {
    if (!Array.isArray(values) || values.length === 0) return;

    const question = known.get(questionId);
    // Respostas abertas têm uma finalidade privada para as IAs; não devem virar
    // chips na home, onde poderiam expor texto pessoal por acidente.
    if (question?.type === 'availability' || question?.type === 'open') return;

    const label = ROLE_LABELS[question?.role ?? ''] ?? 'Sua resposta';
    const existing = byLabel.get(label);

    if (existing) {
      existing.values = [...new Set([...existing.values, ...values])];
      return;
    }

    byLabel.set(label, { id: questionId, label, values: [...values] });
  });

  const chips: ProfileChip[] = [...byLabel.values()];

  const routine = normalizeAvailability(trail.availability);
  const scale = trail.adaptiveMinutesPerSession
    ? trail.adaptiveMinutesPerSession / routine.minutesPerSession
    : 1;

  if (routine.weekdays.length > 0) {
    /*
     * No modo por dia, o resumo mostra dia a dia: dizer "45 min por sessão" para
     * quem reservou 20 na terça e 90 no sábado seria uma média que não existe em
     * nenhum dia real da semana dessa pessoa.
     */
    const values = routine.mode === 'per_day'
      ? routine.weekdays.map((day) => (
        `${WEEKDAY_LABELS[day]}: ${Math.round(minutesForWeekday(routine, day) * scale)} min`
      ))
      : [
        routine.weekdays.map((day) => WEEKDAY_LABELS[day]).join(' · '),
        `${Math.round(routine.minutesPerSession * scale)} min por sessão`,
      ];

    chips.push({ id: '__availability', label: ROLE_LABELS.disponibilidade, values });
  }

  return chips;
}

// ---------------------------------------------------------------------------
// Descoberta ordenada por afinidade
// ---------------------------------------------------------------------------

/** Remove acentos e caixa para comparar tags autoradas com texto do catálogo. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
}

/**
 * Sinais que o perfil do aluno emite: as tags autoradas nas opções que ele
 * marcou, mais as palavras das próprias respostas. Serve tanto para ordenar o
 * catálogo quanto, na Fase E, para desempatar candidatos no `matching`.
 */
export function collectProfileSignals(
  trail: LearningTrail,
  questionnaire?: Questionnaire | null,
): { tags: Set<string>; tokens: Set<string> } {
  const tags = new Set<string>();
  const tokens = new Set<string>();

  Object.entries(trail.answers || {}).forEach(([questionId, values]) => {
    const question = questionnaire?.questions.find((item) => item.id === questionId);

    values.forEach((value) => {
      tokenize(value).forEach((token) => tokens.add(token));
      question?.options
        .find((option) => option.label === value)
        ?.tags?.forEach((tag) => tags.add(normalize(tag)));
    });
  });

  return { tags, tokens };
}

const LEVEL_BY_TAG: Record<string, CatalogCourse['level']> = {
  iniciante: 'Essencial',
  iniciacao: 'Essencial',
  fundamentos: 'Essencial',
  aprofundamento: 'Avançado',
  avancado: 'Avançado',
};

/**
 * Ordena o catálogo pela afinidade com o perfil. Ordenação estável: empates
 * mantêm a ordem original, para a lista não dançar entre renderizações.
 */
export function rankCatalogByAffinity<
  T extends { category: string; title: string; description: string; level: string; progress?: number },
>(
  courses: T[],
  trail: LearningTrail | null,
  questionnaire?: Questionnaire | null,
): T[] {
  if (!trail) return [...courses];

  const { tags, tokens } = collectProfileSignals(trail, questionnaire);
  const preferredLevels = new Set(
    [...tags].map((tag) => LEVEL_BY_TAG[tag]).filter(Boolean) as string[],
  );

  const scored = courses.map((course, index) => {
    const category = normalize(course.category);
    const haystack = new Set([...tokenize(course.title), ...tokenize(course.description), category]);

    let score = 0;
    tags.forEach((tag) => {
      if (haystack.has(tag) || category.includes(tag)) score += 3;
    });
    tokens.forEach((token) => {
      if (haystack.has(token)) score += 2;
    });
    if (preferredLevels.has(course.level)) score += 1;
    // Curso já iniciado sobe: retomar custa menos do que começar do zero.
    if (typeof course.progress === 'number' && course.progress > 0) score += 2;

    return { course, score, index };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ course }) => course);
}

// ---------------------------------------------------------------------------
// Sinais implícitos
// ---------------------------------------------------------------------------

export type ImplicitSignals = {
  completedCount: number;
  /** Conteúdos que a pessoa tirou da agenda — desinteresse explícito. */
  removedCount: number;
  removedByRole: Record<LearningRole, number>;
  /** Pendências que já foram remarcadas ao menos uma vez. */
  rescheduledCount: number;
  /** Fração de pendências remarcadas: acima de 0,5 a rotina não cabe. */
  lateRate: number;
  /** Hora do dia em que a pessoa costuma concluir (0-23), quando há dados. */
  preferredHour: number | null;
};

/**
 * O que o comportamento diz sem que ninguém pergunte.
 *
 * Regra de ouro: um sinal implícito pode **fazer uma pergunta**; não pode mudar
 * a trilha por baixo dos panos. Se o conteúdo muda, o `reason` visível ao aluno
 * tem de mudar junto — caso contrário a tela passa a mentir de novo, que é
 * exatamente o problema que este trabalho veio resolver.
 */
export function deriveImplicitSignals(trail: LearningTrail): ImplicitSignals {
  const removedByRole: Record<LearningRole, number> = { essential: 0, deepening: 0, extra: 0 };
  (trail.excludedItems || []).forEach((item) => {
    removedByRole[item.learningRole] += 1;
  });

  const pending = trail.items.filter((item) => item.status === 'pending');
  const rescheduledCount = pending.filter((item) => item.rescheduled).length;

  const hours = trail.items.flatMap((item) => {
    if (item.status !== 'completed' || !item.completedAt) return [];
    const completedAt = new Date(item.completedAt);
    return Number.isNaN(completedAt.getTime()) ? [] : [completedAt.getHours()];
  });

  return {
    completedCount: trail.items.filter((item) => item.status === 'completed').length,
    removedCount: (trail.excludedItems || []).length,
    removedByRole,
    rescheduledCount,
    lateRate: pending.length > 0 ? rescheduledCount / pending.length : 0,
    preferredHour: hours.length > 0
      ? Math.round(hours.reduce((sum, hour) => sum + hour, 0) / hours.length)
      : null,
  };
}

// ---------------------------------------------------------------------------
// Navegação
// ---------------------------------------------------------------------------

/** Mesmo destino usado por /minha-trilha — um lugar só decide para onde um item leva. */
export function contentHref(item: LearningTrailItem): string {
  if (item.type === 'lesson') return `/courses/${item.courseId || 'c1'}/lessons/${item.slug || item.id}`;
  if (item.type === 'article') return item.slug ? `/blog/${item.slug}` : '/blog';
  return item.url || '#';
}

export const ROLE_CHIP_LABELS: Record<LearningRole, string> = {
  essential: 'Essencial',
  deepening: 'Aprofundamento',
  extra: 'Extra',
};

/**
 * O aviso de conteúdo maior que a meta do dia (`item.overBudget`).
 *
 * Uma masterclass de 60 minutos numa rotina de 30 entra na agenda do mesmo
 * jeito: descartá-la esconderia o conteúdo, e adiá-la para sempre é pior do que
 * estourar a meta uma vez. O que não pode é a pessoa abrir a sessão e só então
 * descobrir que hoje leva o dobro do tempo — por isso o aviso vem no card, e o
 * texto vive aqui para a home e a trilha dizerem a mesma coisa.
 */
export const LONGER_CONTENT_LABEL = 'Conteúdo mais longo';
/** A mesma informação onde só cabe uma linha — a lista compacta da agenda. */
export const LONGER_CONTENT_SHORT = 'Mais longo';
export const LONGER_CONTENT_HINT =
  'Este conteúdo é maior que sua meta diária. Ele fica sozinho nesta sessão — reserve um tempo extra ou adie o dia.';
