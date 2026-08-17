import { describe, expect, it } from 'vitest';
import {
  computeStudyStats,
  contentHref,
  deriveProfileSummary,
  rankCatalogByAffinity,
  selectHomeState,
} from './studentHome';
import { CATALOG_COURSES } from './catalog';
import { mockQuestionnaire } from './seed/questionnaire';
import type { LearningTrail, LearningTrailItem, StudyAvailability } from '@/types/trilha';

// Segunda-feira. Toda a suíte trabalha em horário local, como o produto.
const MONDAY = new Date(2026, 7, 10, 9, 0, 0);

function item(overrides: Partial<LearningTrailItem> & { id: string }): LearningTrailItem {
  return {
    type: 'lesson',
    title: overrides.id,
    durationMin: 10,
    order: 1,
    reason: 'test',
    score: 1,
    learningRole: 'essential',
    status: 'pending',
    scheduledDate: '2026-08-10',
    sessionId: '2026-08-10-1',
    ...overrides,
  };
}

function trailWith(
  items: LearningTrailItem[],
  availability: StudyAvailability = { weekdays: [1, 3, 5], minutesPerSession: 30 },
  extra: Partial<LearningTrail> = {},
): LearningTrail {
  return {
    formatVersion: 3,
    userId: 'user-1',
    items,
    generatedAt: MONDAY.getTime(),
    questionnaireVersion: 3,
    answers: {},
    availability,
    ...extra,
  };
}

describe('selectHomeState', () => {
  it('reports sem-trilha for a missing or empty trail', () => {
    expect(selectHomeState(null, MONDAY).kind).toBe('sem-trilha');
    expect(selectHomeState(trailWith([]), MONDAY).kind).toBe('sem-trilha');
  });

  it('picks the first pending item of today as the single next step', () => {
    const state = selectHomeState(
      trailWith([
        item({ id: 'a', order: 1, status: 'completed' }),
        item({ id: 'b', order: 2, durationMin: 15 }),
        item({ id: 'c', order: 3, durationMin: 20 }),
      ]),
      MONDAY,
    );

    if (state.kind !== 'dia-pronto') throw new Error(`esperava dia-pronto, veio ${state.kind}`);
    expect(state.session.nextStep?.id).toBe('b');
    expect(state.session.pending.map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(state.session.done.map((entry) => entry.id)).toEqual(['a']);
    expect(state.session.remainingMinutes).toBe(35);
    expect(state.session.offsetInDays).toBe(0);
  });

  it('discards past days and moves focus to the next scheduled session', () => {
    const state = selectHomeState(
      trailWith([
        item({ id: 'atrasado', scheduledDate: '2026-08-05', sessionId: '2026-08-05-1' }),
        item({ id: 'futuro', scheduledDate: '2026-08-12', sessionId: '2026-08-12-1' }),
      ]),
      MONDAY,
    );

    if (state.kind !== 'dia-pronto') throw new Error(`esperava dia-pronto, veio ${state.kind}`);
    expect(state.session.nextStep?.id).toBe('futuro');
    expect(state.session.offsetInDays).toBe(2);
    // Prever o fim só faz sentido para hoje.
    expect(state.session.finishesAt).toBeNull();
  });

  it('estimates the finish time only for today', () => {
    const state = selectHomeState(trailWith([item({ id: 'a', durationMin: 45 })]), MONDAY);

    if (state.kind !== 'dia-pronto') throw new Error(`esperava dia-pronto, veio ${state.kind}`);
    expect(state.session.finishesAt?.getHours()).toBe(9);
    expect(state.session.finishesAt?.getMinutes()).toBe(45);
  });

  it('prefers the finished day over a future pending session', () => {
    const state = selectHomeState(
      trailWith([
        item({ id: 'a', status: 'completed' }),
        item({ id: 'b', scheduledDate: '2026-08-12', sessionId: '2026-08-12-1' }),
      ]),
      MONDAY,
    );

    if (state.kind !== 'dia-concluido') throw new Error(`esperava dia-concluido, veio ${state.kind}`);
    expect(state.session.nextStep).toBeNull();
    expect(state.next?.nextStep?.id).toBe('b');
  });

  it('ignores items that were never scheduled', () => {
    // Itens sem `sessionId`/`scheduledDate` existem enquanto a trilha é montada.
    const state = selectHomeState(
      trailWith([
        item({ id: 'orfao', scheduledDate: '', sessionId: '' }),
        item({ id: 'valido' }),
      ]),
      MONDAY,
    );

    if (state.kind !== 'dia-pronto') throw new Error(`esperava dia-pronto, veio ${state.kind}`);
    expect(state.session.items.map((entry) => entry.id)).toEqual(['valido']);
  });

  it('reports sem-agenda when everything scheduled is already behind', () => {
    const state = selectHomeState(
      trailWith([item({ id: 'a', scheduledDate: '2026-08-03', sessionId: '2026-08-03-1' })]),
      MONDAY,
    );
    expect(state.kind).toBe('sem-agenda');
  });
});

describe('computeStudyStats', () => {
  it('derives the weekly goal from the chosen routine, not from a product constant', () => {
    const stats = computeStudyStats(
      trailWith([item({ id: 'a' })], { weekdays: [1, 3], minutesPerSession: 30 }),
      MONDAY,
    );

    expect(stats.weekGoalDays).toBe(2);
    expect(stats.weekDays.filter((day) => day.planned).map((day) => day.label)).toEqual(['Seg', 'Qua']);
    expect(stats.weekDays[0].isToday).toBe(true);
    expect(stats.weekDays[6].isFuture).toBe(true);
  });

  it('counts completed days inside the current week', () => {
    const stats = computeStudyStats(
      trailWith([
        item({ id: 'a', status: 'completed', completedAt: new Date(2026, 7, 10, 8).toISOString() }),
        item({ id: 'b', status: 'completed', completedAt: new Date(2026, 7, 5, 8).toISOString() }),
      ]),
      MONDAY,
    );

    expect(stats.weekDoneDays).toBe(1);
    expect(stats.completedCount).toBe(2);
  });

  it('keeps the streak alive across days outside the routine', () => {
    // Rotina Seg/Qua/Sex: sábado e domingo vazios não podem quebrar a sequência.
    const stats = computeStudyStats(
      trailWith(
        [
          item({ id: 'a', status: 'completed', completedAt: new Date(2026, 7, 10, 8).toISOString() }),
          item({ id: 'b', status: 'completed', completedAt: new Date(2026, 7, 7, 8).toISOString() }),
        ],
        { weekdays: [1, 3, 5], minutesPerSession: 30 },
      ),
      MONDAY,
    );

    expect(stats.streakDays).toBe(2);
  });

  it('breaks the streak on a planned day that was skipped', () => {
    const stats = computeStudyStats(
      trailWith(
        [
          item({ id: 'a', status: 'completed', completedAt: new Date(2026, 7, 10, 8).toISOString() }),
          // Pulou sexta (07) e quarta (05); a sequência para em segunda.
          item({ id: 'b', status: 'completed', completedAt: new Date(2026, 7, 3, 8).toISOString() }),
        ],
        { weekdays: [1, 3, 5], minutesPerSession: 30 },
      ),
      MONDAY,
    );

    expect(stats.streakDays).toBe(1);
  });

  it('does not break the streak just because today has no completion yet', () => {
    const stats = computeStudyStats(
      trailWith(
        [item({ id: 'a', status: 'completed', completedAt: new Date(2026, 7, 7, 8).toISOString() })],
        { weekdays: [1, 3, 5], minutesPerSession: 30 },
      ),
      MONDAY,
    );

    expect(stats.streakDays).toBe(1);
  });

  it('sums only the minutes completed in the last 30 days', () => {
    const stats = computeStudyStats(
      trailWith([
        item({ id: 'a', durationMin: 20, status: 'completed', completedAt: new Date(2026, 7, 9).toISOString() }),
        item({ id: 'b', durationMin: 30, status: 'completed', completedAt: new Date(2026, 5, 1).toISOString() }),
        item({ id: 'c', durationMin: 40 }),
      ]),
      MONDAY,
    );

    expect(stats.minutesLast30Days).toBe(20);
    expect(stats.completionRate).toBe(67);
  });
});

describe('deriveProfileSummary', () => {
  it('turns stored answers and the routine into readable chips', () => {
    const chips = deriveProfileSummary(
      trailWith([item({ id: 'a' })], { weekdays: [1, 3], minutesPerSession: 30 }, {
        answers: {
          q_objetivo: ['Sair do zero com segurança'],
          q_problema: ['Procrastinação', 'Falta de Tempo'],
        },
      }),
      mockQuestionnaire,
    );

    expect(chips.map((chip) => chip.label)).toEqual(['Seu perfil', 'O que te trava', 'Sua rotina']);
    expect(chips[1].values).toEqual(['Procrastinação', 'Falta de Tempo']);
    expect(chips[2].values).toEqual(['Seg · Qua', '30 min por sessão']);
  });

  it('merges questions that share a role into a single chip', () => {
    // O questionário padrão tem duas perguntas de papel `perfil`.
    const chips = deriveProfileSummary(
      trailWith([item({ id: 'a' })], { weekdays: [1], minutesPerSession: 30 }, {
        answers: {
          q_formato: ['Prática Rápida (Mão na massa)'],
          q_objetivo: ['Sair do zero com segurança'],
        },
      }),
      mockQuestionnaire,
    );

    expect(chips.filter((chip) => chip.label === 'Seu perfil')).toHaveLength(1);
    expect(chips[0].values).toEqual([
      'Prática Rápida (Mão na massa)',
      'Sair do zero com segurança',
    ]);
  });

  it('shows the adapted session length once feedback has changed it', () => {
    const chips = deriveProfileSummary(
      trailWith([item({ id: 'a' })], { weekdays: [1], minutesPerSession: 30 }, {
        adaptiveMinutesPerSession: 20,
      }),
      mockQuestionnaire,
    );

    expect(chips.at(-1)?.values).toContain('20 min por sessão');
  });

  it('survives answers whose question or option no longer exists', () => {
    // `answers` é indexado pelo texto da opção: renomear no admin órfã a resposta.
    const chips = deriveProfileSummary(
      trailWith([item({ id: 'a' })], { weekdays: [1], minutesPerSession: 30 }, {
        answers: { pergunta_removida: ['Uma resposta antiga'] },
      }),
      mockQuestionnaire,
    );

    expect(chips[0]).toEqual({
      id: 'pergunta_removida',
      label: 'Sua resposta',
      values: ['Uma resposta antiga'],
    });
  });
});

describe('rankCatalogByAffinity', () => {
  it('returns the catalog untouched when there is no trail', () => {
    expect(rankCatalogByAffinity(CATALOG_COURSES, null)).toEqual(CATALOG_COURSES);
  });

  it('is a stable sort — ties keep the original order', () => {
    const ranked = rankCatalogByAffinity(
      CATALOG_COURSES,
      trailWith([item({ id: 'a' })], { weekdays: [1], minutesPerSession: 30 }, { answers: {} }),
      mockQuestionnaire,
    );

    expect(ranked).toHaveLength(CATALOG_COURSES.length);
    // Sem sinais de perfil, só o curso já iniciado sobe.
    expect(ranked[0].id).toBe('c1');
  });

  it('lifts courses whose category matches the answers', () => {
    const ranked = rankCatalogByAffinity(
      CATALOG_COURSES,
      trailWith([item({ id: 'a' })], { weekdays: [1], minutesPerSession: 30 }, {
        answers: { q_habilidades: ['Negociação ganha-ganha'] },
      }),
      mockQuestionnaire,
    );

    expect(ranked.slice(0, 2).map((course) => course.id)).toContain('c5');
  });
});

describe('contentHref', () => {
  it('routes each content type to its own surface', () => {
    expect(contentHref(item({ id: 'l1', courseId: 'c9' }))).toBe('/courses/c9/lessons/l1');
    expect(contentHref(item({ id: 'a1', type: 'article', slug: 'rotina' }))).toBe('/blog/rotina');
    expect(contentHref(item({ id: 'a2', type: 'article' }))).toBe('/blog');
    expect(contentHref(item({ id: 'e1', type: 'external_link', url: 'https://x.dev' }))).toBe('https://x.dev');
  });
});
