import { describe, expect, it } from 'vitest';
import { applySessionFeedback, generateLearningTrail, postponeTrailSession, removeTrailItem, replanLearningTrail, restoreTrailItem, schedulePendingItems, updateTrailAvailability, validateQuestionnaire } from './matching';
import { mockQuestionnaire, TRAIL_CONTENT_INDEX } from './seed/questionnaire';
import { ContentMapping, LearningTrailItem, Questionnaire } from '@/types/trilha';

describe('adaptive learning trail', () => {
  it('deduplicates mappings, adds prerequisites and raises content matched by more answers', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Prática Rápida (Mão na massa)'],
      q_objetivo: ['Aprofundar o que já pratico'],
      q_problema: ['Estagnação'],
      q_habilidades: ['Prática'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    expect(trail.items.map((item) => item.id)).toEqual(['l1', 'l2', 'l-profile-1', 'l3', 'l4', 'a2']);
    expect(new Set(trail.items.map((item) => item.id)).size).toBe(trail.items.length);
    // 4 pelos mapeamentos explícitos + 0,4 de afinidade (duas tags `pratica`).
    // A fração desempata sem alterar a ordem decidida pelo peso do admin.
    expect(trail.items.find((item) => item.id === 'l3')?.score).toBeCloseTo(4.4);
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
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);
    initial.items[0] = { ...initial.items[0], status: 'completed', completedAt: '2026-08-10T12:00:00.000Z' };

    const updated = generateLearningTrail('u1', {
      q_formato: ['Prática Rápida (Mão na massa)'], q_objetivo: ['Aprofundar o que já pratico'],
    }, mockQuestionnaire, { weekdays: [2, 4], minutesPerSession: 45 }, initial, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    expect(updated.items.find((item) => item.id === initial.items[0].id)?.status).toBe('completed');
    expect(updated.items.filter((item) => item.status === 'pending').every((item) => ['2026-08-11', '2026-08-13', '2026-08-18'].includes(item.scheduledDate))).toBe(true);
  });

  /*
   * Afinidade isolada: um questionário cujas opções carregam tags mas **nenhum**
   * `contentMappings`. Assim o único caminho para um conteúdo entrar na trilha é
   * o metadado autorado na curadoria — que é justamente o que a Fase E liga.
   */
  const tagsOnlyQuestionnaire = (label: string, tags: string[]): Questionnaire => ({
    version: 1,
    status: 'published',
    questions: [
      { id: 'q_tags', type: 'multiple', role: 'interesse', text: 'Interesses', options: [{ label, tags }] },
      { id: 'q_disp', type: 'availability', role: 'disponibilidade', text: 'Quando?', options: [] },
    ],
  });

  it('lets unmapped content in as extra when the authored metadata matches', () => {
    // `l1` tem topics ['fundamentos'] e nenhum pré-requisito.
    const trail = generateLearningTrail('u1', { q_tags: ['Fundamentos'] },
      tagsOnlyQuestionnaire('Fundamentos', ['fundamentos']),
      { weekdays: [1, 3], minutesPerSession: 60 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    const l1 = trail.items.find((item) => item.id === 'l1');
    expect(l1).toBeDefined();
    expect(l1?.learningRole).toBe('extra');
    expect(l1?.reason).toBe('Recomendado por: seu interesse em Fundamentos');
  });

  it('does not pull an unmapped item whose prerequisites are missing', () => {
    // `l4` casa com a tag `aprofundamento`, mas depende de `l3` — que ninguém
    // mapeou. Entrar sozinho arrastaria a cadeia l3 → l2 → l1 como "essencial".
    const trail = generateLearningTrail('u1', { q_tags: ['Aprofundar'] },
      tagsOnlyQuestionnaire('Aprofundar', ['aprofundamento']),
      { weekdays: [1, 3], minutesPerSession: 60 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    expect(trail.items).toEqual([]);
  });

  it('keeps affinity from outranking an explicitly mapped essential', () => {
    const trail = generateLearningTrail('u1', {
      q_problema: ['Insegurança'],
      q_habilidades: ['Fundamentos'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 60 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    const roles = trail.items.map((item) => item.learningRole);
    const firstExtra = roles.indexOf('extra');
    if (firstExtra !== -1) expect(firstExtra).toBeGreaterThan(roles.lastIndexOf('essential'));
  });

  it('keeps completed content that the new answers no longer recommend', () => {
    const initial = generateLearningTrail('u1', {
      q_formato: ['Prática Rápida (Mão na massa)'], q_habilidades: ['Prática'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    const doneId = initial.items[0].id;
    initial.items[0] = { ...initial.items[0], status: 'completed', completedAt: '2026-08-10T12:00:00.000Z' };

    // Respostas completamente diferentes: o conteúdo concluído sai da curadoria.
    const updated = generateLearningTrail('u1', {
      q_problema: ['Falta de Tempo'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, initial, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    const retained = updated.items.find((item) => item.id === doneId);
    expect(retained?.status).toBe('completed');
    expect(retained?.completedAt).toBe('2026-08-10T12:00:00.000Z');
    // O histórico vem antes do que ainda está por fazer.
    expect(updated.items.findIndex((item) => item.id === doneId)).toBe(0);
    expect(updated.items.map((item) => item.order)).toEqual(updated.items.map((_, index) => index + 1));
  });

  it('replans overdue pending items without moving completed history', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 20 }, undefined, new Date(2026, 7, 3), TRAIL_CONTENT_INDEX);
    trail.items[0] = { ...trail.items[0], status: 'completed' };
    const completedDate = trail.items[0].scheduledDate;

    const result = replanLearningTrail(trail, new Date(2026, 7, 10));
    expect(result.changed).toBe(true);
    expect(result.trail.items[0].scheduledDate).toBe(completedDate);
    expect(result.trail.items.filter((item) => item.status === 'pending').every((item) => item.scheduledDate >= '2026-08-10')).toBe(true);
    expect(result.trail.items.some((item) => item.rescheduled)).toBe(true);
  });

  it('validates the unique final availability question and custom durations', () => {
    expect(validateQuestionnaire(mockQuestionnaire, TRAIL_CONTENT_INDEX)).toEqual([]);
    const invalid: Questionnaire = {
      ...mockQuestionnaire,
      questions: [mockQuestionnaire.questions.at(-1)!, ...mockQuestionnaire.questions.slice(0, -1)],
    };
    expect(validateQuestionnaire(invalid, TRAIL_CONTENT_INDEX)).toContain('A disponibilidade precisa ser a última pergunta.');
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

  it('adapts the next session target from load feedback', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3, 5], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);
    const sessionId = trail.items[0].sessionId;
    trail.items[0] = { ...trail.items[0], status: 'completed' };

    const lighter = applySessionFeedback(trail, sessionId, 'heavy', new Date(2026, 7, 10));
    expect(lighter.adaptiveMinutesPerSession).toBe(20);
    expect(lighter.feedbackHistory?.[0].rating).toBe('heavy');
    expect(lighter.items.filter((item) => item.status === 'pending').every((item) => item.scheduledDate >= '2026-08-12')).toBe(true);

    const raisedAgain = applySessionFeedback(lighter, sessionId, 'light', new Date(2026, 7, 10));
    expect(raisedAgain.adaptiveMinutesPerSession).toBe(30);
    expect(raisedAgain.feedbackHistory).toHaveLength(1);
  });

  it('updates routine, postpones sessions and preserves completed history', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 20 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);
    trail.items[0] = { ...trail.items[0], status: 'completed' };
    const completedDate = trail.items[0].scheduledDate;
    const adjusted = updateTrailAvailability(trail, { weekdays: [2, 4], minutesPerSession: 45 }, new Date(2026, 7, 10));
    expect(adjusted.items[0].scheduledDate).toBe(completedDate);
    expect(adjusted.items.filter((item) => item.status === 'pending')[0].scheduledDate).toBe('2026-08-11');

    const firstPendingSession = adjusted.items.find((item) => item.status === 'pending')!.sessionId;
    const postponed = postponeTrailSession(adjusted, firstPendingSession);
    expect(postponed.items.find((item) => item.status === 'pending')!.scheduledDate).toBe('2026-08-13');
  });

  it('removes and restores pending content without losing it', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);
    const target = trail.items.at(-1)!;
    const removed = removeTrailItem(trail, target.id, new Date(2026, 7, 10));
    expect(removed.items.some((item) => item.id === target.id)).toBe(false);
    expect(removed.excludedItems?.some((item) => item.id === target.id)).toBe(true);

    const restored = restoreTrailItem(removed, target.id, new Date(2026, 7, 10));
    expect(restored.items.some((item) => item.id === target.id)).toBe(true);
    expect(restored.excludedItems).toEqual([]);
  });
});
