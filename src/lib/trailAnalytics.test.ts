import { describe, expect, it } from 'vitest';
import { formatDuration, snapshotFromTrail, summarizeTrailHealth, TrailAnalyticsEvent, TrailSnapshot } from './trailAnalytics';
import { LearningTrail, LearningTrailItem, Question } from '@/types/trilha';

const item = (id: string, status: LearningTrailItem['status'], sessionId = 's1'): LearningTrailItem => ({
  id, type: 'lesson', title: `Aula ${id}`, durationMin: 20, order: 1, reason: 'x', score: 1,
  learningRole: 'essential', status, scheduledDate: '2026-09-10', sessionId,
});

const trail = (userId: string, overrides: Partial<LearningTrail> = {}): LearningTrail => ({
  formatVersion: 3, userId, generatedAt: 1, questionnaireVersion: 1, answers: {},
  availability: { weekdays: [1, 3, 5], minutesPerSession: 30 },
  items: [item('a', 'completed'), item('b', 'pending', 's2')],
  ...overrides,
});

const TODAY = new Date(2026, 9, 1); // 1º de outubro de 2026, horário local

const snap = (userId: string, overrides: Partial<TrailSnapshot> = {}): TrailSnapshot => ({
  userId, name: `Aluno ${userId}`, questionnaireVersion: 1, answers: {},
  availability: { weekdays: [1, 3, 5], minutesPerSession: 30 }, feedbackHistory: [],
  totalItems: 2, completedItems: 1, pendingItems: 1, pendingMinutes: 20, projectedEndDate: '2026-10-11',
  ...overrides,
});

const questions: Question[] = [
  {
    id: 'q_momento', type: 'single', role: 'perfil', text: 'Qual o seu momento?',
    options: [{ label: 'Líder', tags: [] }, { label: 'Executor', tags: [] }, { label: 'Estudante', tags: [] }],
  },
  { id: 'q_cargo', type: 'open', role: 'contexto', text: 'Qual seu cargo atual {{nome}}?', options: [] },
  { id: 'q_rotina', type: 'availability', role: 'disponibilidade', text: 'Quando você prefere estudar?', options: [] },
];

let seq = 0;
const ev = (userId: string, type: TrailAnalyticsEvent['type'], payload?: TrailAnalyticsEvent['payload'], occurredAt = '2026-09-20T10:00:00Z'): TrailAnalyticsEvent => ({
  id: String(++seq), userId, type, occurredAt, payload,
});

describe('summarizeTrailHealth', () => {
  it('conta pessoas no onboarding, não recarregamentos da página', () => {
    const summary = summarizeTrailHealth({
      questions,
      trails: [],
      events: [
        ev('u1', 'onboarding_started'), ev('u1', 'onboarding_started'), ev('u1', 'onboarding_started'),
        ev('u2', 'onboarding_started'),
        ev('u1', 'plan_generated'),
        // Recalibração na home não é onboarding concluído.
        ev('u2', 'plan_generated', { reason: 'refinement' }),
      ],
    });
    expect(summary.onboarding).toEqual({ starters: 2, completers: 1, completionRate: 50 });
  });

  it('agrupa o funil por pergunta, inclusive eventos antigos com o nome interpolado', () => {
    const summary = summarizeTrailHealth({
      questions,
      trails: [],
      events: [
        ev('u1', 'onboarding_started'), ev('u2', 'onboarding_started'), ev('u3', 'onboarding_started'),
        ev('u1', 'onboarding_step_viewed', { step: 1, questionId: 'q_momento', label: 'Qual o seu momento?' }),
        ev('u2', 'onboarding_step_viewed', { step: 1, label: 'Qual o seu momento?' }),
        // Legado: só o texto já interpolado, e numa posição de outra versão.
        ev('u1', 'onboarding_step_viewed', { step: 3, label: 'Qual seu cargo atual Nohan?' }),
        ev('u2', 'onboarding_step_viewed', { step: 2, label: 'Qual seu cargo atual Gustavo?' }),
        ev('u1', 'onboarding_step_viewed', { step: 3, questionId: 'q_rotina', label: 'Quando você prefere estudar?' }),
        ev('u1', 'plan_generated'),
      ],
    });

    expect(summary.funnel.map((step) => [step.key, step.users])).toEqual([
      ['opened', 3], ['q_momento', 2], ['q_cargo', 2], ['q_rotina', 1], ['generated', 1],
    ]);
    expect(summary.funnel[0].dropRate).toBe(33);
    expect(summary.funnel[2].dropRate).toBe(50);
    expect(summary.funnel[4].reachRate).toBe(33);
  });

  it('mantém o funil monotônico quando uma pergunta mudou de texto entre versões', () => {
    const summary = summarizeTrailHealth({
      questions,
      trails: [],
      events: [
        ev('u1', 'onboarding_started'), ev('u2', 'onboarding_started'),
        ev('u1', 'onboarding_step_viewed', { step: 1, questionId: 'q_momento' }),
        // A etapa 2 de u2 era uma pergunta que não existe mais — ele seguiu adiante mesmo assim.
        ev('u2', 'onboarding_step_viewed', { step: 2, label: 'Você se considera um bom ouvinte?' }),
        ev('u2', 'onboarding_step_viewed', { step: 3, questionId: 'q_rotina' }),
        ev('u3', 'plan_generated'),
      ],
    });
    expect(summary.onboarding.starters).toBe(3);
    expect(summary.funnel.map((step) => step.users)).toEqual([3, 3, 2, 2, 1]);
  });

  it('não mostra funil quando ninguém abriu o onboarding', () => {
    expect(summarizeTrailHealth({ questions, trails: [], events: [] }).funnel).toEqual([]);
  });

  it('mede estudo, progresso e replanejamento por aluno com trilha', () => {
    const summary = summarizeTrailHealth({
      questions,
      trails: [snap('u1'), snap('u2', { totalItems: 1, completedItems: 0 })],
      events: [
        ev('u1', 'content_completed', { contentId: 'a' }),
        ev('u1', 'content_completed', { contentId: 'x' }),
        // Mesmo replanejamento registrado pela home e pelo servidor no mesmo dia.
        ev('u2', 'trail_replanned', { reason: 'overdue' }, '2026-09-20T08:00:00Z'),
        ev('u2', 'trail_replanned', { reason: 'overdue' }, '2026-09-20T08:00:01Z'),
        ev('u2', 'session_postponed', { sessionId: 's1' }),
      ],
    });
    expect(summary.studentsWithTrail).toBe(2);
    expect(summary.learners).toEqual({ active: 1, activeRate: 50, completedContents: 2 });
    expect(summary.progress).toEqual({ completedItems: 1, totalItems: 3, rate: 33 });
    expect(summary.replans).toEqual({ students: 1, rate: 50, adjustments: 2 });
    expect(summary.routine).toEqual({ averageSessionMinutes: 30, averageWeekdays: 3, averageWeeklyMinutes: 90 });
  });

  it('distribui as respostas pelas opções publicadas e separa as que saíram', () => {
    const summary = summarizeTrailHealth({
      questions,
      events: [],
      today: TODAY,
      trails: [
        snap('u1', { answers: { q_momento: ['Líder'], q_cargo: ['Gerente'] }, projectedEndDate: '2026-10-11' }),
        snap('u2', { answers: { q_momento: ['Líder'] }, projectedEndDate: '2026-12-30' }),
        snap('u3', { answers: { q_momento: ['Opção de uma versão antiga'], q_cargo: ['  '] } }),
      ],
    });
    const [momento, cargo] = summary.answers;
    expect(summary.answers).toHaveLength(2);
    expect(momento.respondents).toBe(3);
    expect(momento.options).toEqual([
      // Média de 10 e 90 dias até concluir: quem escolheu "Líder" recebe trilhas longas.
      { label: 'Líder', count: 2, share: 67, averageDaysToFinish: 50 },
      { label: 'Executor', count: 0, share: 0, averageDaysToFinish: null },
      { label: 'Estudante', count: 0, share: 0, averageDaysToFinish: null },
    ]);
    expect(momento.legacyAnswers).toBe(1);
    expect(cargo).toMatchObject({ type: 'open', respondents: 1, options: [] });
  });

  it('filtra o feedback de carga pelo período e calcula a carga suportada', () => {
    const summary = summarizeTrailHealth({
      questions,
      events: [],
      since: new Date('2026-09-01T00:00:00Z'),
      trails: [snap('u1', {
        feedbackHistory: [
          { sessionId: 's0', rating: 'heavy', submittedAt: '2026-08-10T00:00:00Z', plannedMinutes: 30, completedMinutes: 30, previousTargetMinutes: 30, nextTargetMinutes: 20 },
          { sessionId: 's1', rating: 'right', submittedAt: '2026-09-10T00:00:00Z', plannedMinutes: 30, completedMinutes: 20, previousTargetMinutes: 30, nextTargetMinutes: 30 },
          { sessionId: 's2', rating: 'light', submittedAt: '2026-09-12T00:00:00Z', plannedMinutes: 30, completedMinutes: 40, previousTargetMinutes: 30, nextTargetMinutes: 40 },
          { sessionId: 's3', rating: 'heavy', submittedAt: '2026-09-14T00:00:00Z', plannedMinutes: 30, completedMinutes: 50, previousTargetMinutes: 40, nextTargetMinutes: 30 },
        ],
      })],
    });
    expect(summary.feedback).toEqual({ total: 3, counts: { light: 1, right: 1, heavy: 1 }, averageSupportedMinutes: 30 });
  });

  it('ranqueia os conteúdos adiados', () => {
    const summary = summarizeTrailHealth({
      questions,
      trails: [snap('u1')],
      events: [
        ev('u1', 'content_postponed', { itemId: 'b', title: 'Aula B' }),
        ev('u2', 'content_postponed', { itemId: 'b', title: 'Aula B' }),
        ev('u1', 'content_postponed', { itemId: 'z' }),
      ],
    });
    expect(summary.postponedContents).toEqual([
      { id: 'b', title: 'Aula B', count: 2, users: 2 },
      { id: 'z', title: 'Conteúdo sem título registrado', count: 1, users: 1 },
    ]);
  });

  it('mede quanto falta para cada trilha terminar e destaca as longas', () => {
    const summary = summarizeTrailHealth({
      questions,
      events: [],
      today: TODAY,
      trails: [
        snap('curta', { projectedEndDate: '2026-10-21' }), // 20 dias
        snap('media', { projectedEndDate: '2026-12-10' }), // 70 dias
        snap('longa', { projectedEndDate: '2028-01-10', pendingItems: 356, pendingMinutes: 2194 }),
        snap('fim', { pendingItems: 0, completedItems: 2, projectedEndDate: null }),
        snap('sem-agenda', { projectedEndDate: null }),
      ],
    });

    expect(summary.duration.medianDays).toBe(70);
    expect(summary.duration.longCount).toBe(1);
    expect(summary.duration.finishedCount).toBe(1);
    expect(summary.duration.buckets.map((bucket) => bucket.count)).toEqual([1, 1, 0, 1]);
    expect(summary.duration.longest[0]).toMatchObject({
      userId: 'longa', name: 'Aluno longa', pendingItems: 356, pendingHours: 36.6, weeklyMinutes: 90, daysToFinish: 466,
      // 2194 min em 466 dias: a agenda roda a ~33 min/semana, bem abaixo dos 90 declarados.
      scheduledWeeklyMinutes: 33,
    });
    expect(summary.alerts[0].detail).toContain('o motor aliviou a carga');

    expect(summary.alerts[0]).toMatchObject({ id: 'long-trails', tone: 'warning', target: { kind: 'section', id: 'duracao' } });
    expect(summary.alerts[0].title).toBe('1 de 3 trilhas levam mais de 3 meses para terminar');
  });

  it('aponta a pergunta com mais abandono, mas só com gente suficiente', () => {
    const events = [
      ...['u1', 'u2', 'u3', 'u4'].map((user) => ev(user, 'onboarding_step_viewed', { questionId: 'q_momento' })),
      ev('u1', 'onboarding_step_viewed', { questionId: 'q_cargo' }),
      ev('u1', 'plan_generated'),
    ];
    const summary = summarizeTrailHealth({ questions, trails: [], events });
    expect(summary.alerts).toEqual([
      expect.objectContaining({ id: 'funnel-drop', tone: 'danger', target: { kind: 'question', questionId: 'q_momento' } }),
    ]);

    const few = summarizeTrailHealth({ questions, trails: [], events: events.filter((event) => event.userId !== 'u3' && event.userId !== 'u4') });
    expect(few.alerts).toEqual([]);
  });

  it('resume uma trilha inteira no mesmo formato da função do banco', () => {
    const snapshot = snapshotFromTrail(trail('u1', {
      items: [item('a', 'completed'), { ...item('b', 'pending'), scheduledDate: '2026-11-03' }, { ...item('c', 'pending'), scheduledDate: '2026-10-20' }],
    }), 'Ana');
    expect(snapshot).toMatchObject({
      userId: 'u1', name: 'Ana', totalItems: 3, completedItems: 1, pendingItems: 2, pendingMinutes: 40, projectedEndDate: '2026-11-03',
    });
  });

  it('formata a duração em dias, meses ou anos', () => {
    expect(formatDuration(12)).toBe('12 dias');
    expect(formatDuration(73)).toBe('2,4 meses');
    expect(formatDuration(466)).toBe('1,3 ano');
  });
});
