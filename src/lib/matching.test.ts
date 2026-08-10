import { describe, expect, it } from 'vitest';
import { generateLearningTrail, replanLearningTrail, schedulePendingItems, validateQuestionnaire } from './matching';
import { mockQuestionnaire } from './mocks/trilhaMocks';
import { ContentMapping, LearningTrailItem, Questionnaire } from '@/types/trilha';

describe('adaptive learning trail', () => {
  it('deduplicates mappings, adds prerequisites and raises content matched by more answers', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Prática Rápida (Mão na massa)'],
      q_objetivo: ['Aprofundar o que já pratico'],
      q_problema: ['Estagnação'],
      q_habilidades: ['Prática'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10));

    expect(trail.items.map((item) => item.id)).toEqual(['l1', 'l2', 'l-profile-1', 'l3', 'l4', 'a2']);
    expect(new Set(trail.items.map((item) => item.id)).size).toBe(trail.items.length);
    expect(trail.items.find((item) => item.id === 'l3')?.score).toBe(4);
    expect(trail.items.find((item) => item.id === 'l3')?.reason).toContain('Conecta');
    expect(trail.items.findIndex((item) => item.id === 'l3')).toBeLessThan(trail.items.findIndex((item) => item.id === 'l4'));
  });

  it('packs atomic content into preferred study days and isolates over-budget items', () => {
    const base = (id: string, durationMin: number): LearningTrailItem => ({
      id, type: 'lesson', title: id, durationMin, order: 1, reason: 'test', score: 1,
      learningRole: 'essential', status: 'pending', scheduledDate: '', sessionId: '',
    });
    const result = schedulePendingItems(
      [base('a', 12), base('b', 8), base('c', 25), base('d', 5)],
      { weekdays: [1, 3], minutesPerSession: 20 },
      new Date(2026, 7, 10),
    );

    expect(result.slice(0, 2).map((item) => item.scheduledDate)).toEqual(['2026-08-10', '2026-08-10']);
    expect(result[2].scheduledDate).toBe('2026-08-12');
    expect(result[2].overBudget).toBe(true);
    expect(result[3].scheduledDate).toBe('2026-08-17');
  });

  it('starts on the next selected weekday when today is not selected', () => {
    const item: LearningTrailItem = {
      id: 'a', type: 'lesson', title: 'A', durationMin: 10, order: 1, reason: 'test', score: 1,
      learningRole: 'essential', status: 'pending', scheduledDate: '', sessionId: '',
    };
    const [scheduled] = schedulePendingItems([item], { weekdays: [3], minutesPerSession: 30 }, new Date(2026, 7, 10));
    expect(scheduled.scheduledDate).toBe('2026-08-12');
  });

  it('preserves completed content while recalculating future recommendations', () => {
    const initial = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10));
    initial.items[0] = { ...initial.items[0], status: 'completed', completedAt: '2026-08-10T12:00:00.000Z' };

    const updated = generateLearningTrail('u1', {
      q_formato: ['Prática Rápida (Mão na massa)'], q_objetivo: ['Aprofundar o que já pratico'],
    }, mockQuestionnaire, { weekdays: [2, 4], minutesPerSession: 45 }, initial, new Date(2026, 7, 10));

    expect(updated.items.find((item) => item.id === initial.items[0].id)?.status).toBe('completed');
    expect(updated.items.filter((item) => item.status === 'pending').every((item) => ['2026-08-11', '2026-08-13', '2026-08-18'].includes(item.scheduledDate))).toBe(true);
  });

  it('replans overdue pending items without moving completed history', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 20 }, undefined, new Date(2026, 7, 3));
    trail.items[0] = { ...trail.items[0], status: 'completed' };
    const completedDate = trail.items[0].scheduledDate;

    const result = replanLearningTrail(trail, new Date(2026, 7, 10));
    expect(result.changed).toBe(true);
    expect(result.trail.items[0].scheduledDate).toBe(completedDate);
    expect(result.trail.items.filter((item) => item.status === 'pending').every((item) => item.scheduledDate >= '2026-08-10')).toBe(true);
    expect(result.trail.items.some((item) => item.rescheduled)).toBe(true);
  });

  it('validates the unique final availability question and custom durations', () => {
    expect(validateQuestionnaire(mockQuestionnaire)).toEqual([]);
    const invalid: Questionnaire = {
      ...mockQuestionnaire,
      questions: [mockQuestionnaire.questions.at(-1)!, ...mockQuestionnaire.questions.slice(0, -1)],
    };
    expect(validateQuestionnaire(invalid)).toContain('A disponibilidade precisa ser a última pergunta.');
  });

  it('keeps the trail usable when prerequisites contain a cycle', () => {
    const questionnaire: Questionnaire = {
      version: 1,
      status: 'published',
      questions: [
        { id: 'q', type: 'multiple', role: 'perfil', text: 'Escolha', options: [{ label: 'Ambos', contentMappings: [
          { id: 'a', type: 'external_link', title: 'A', url: 'https://example.com/a', estimatedDurationMin: 5, learningRole: 'essential' },
          { id: 'b', type: 'external_link', title: 'B', url: 'https://example.com/b', estimatedDurationMin: 5, learningRole: 'essential' },
        ] }] },
        mockQuestionnaire.questions.at(-1)!,
      ],
    };
    const resolver = (mapping: ContentMapping) => [{
      id: mapping.id,
      type: 'external_link' as const,
      title: mapping.title,
      url: mapping.url,
      durationMin: 5,
      prerequisites: [mapping.id === 'a' ? 'b' : 'a'],
    }];
    const trail = generateLearningTrail('u1', { q: ['Ambos'] }, questionnaire, { weekdays: [1], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), resolver);
    expect(trail.items).toHaveLength(2);
    expect(trail.items.some((item) => item.warnings?.some((warning) => warning.includes('Ciclo')))).toBe(true);
  });
});
