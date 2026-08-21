import { describe, expect, it } from 'vitest';
import { applySessionFeedback, generateLearningTrail, postponeTrailSession, replanLearningTrail, schedulePendingItems, syncTrailCompletion, updateTrailAvailability, validateQuestionnaire, weeklyMinutes } from './matching';
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

  const pending = (
    id: string,
    durationMin: number,
    extra: Partial<LearningTrailItem> = {},
  ): LearningTrailItem => ({
    id, type: 'lesson', title: id, durationMin, order: 1, reason: 'test', score: 1,
    learningRole: 'essential', status: 'pending', scheduledDate: '', sessionId: '', ...extra,
  });

  it('fills each day inside the ±20% tolerance and isolates content no day can hold', () => {
    const result = schedulePendingItems(
      [pending('a', 12), pending('b', 8), pending('c', 25), pending('d', 5)],
      { weekdays: [1, 3], minutesPerSession: 20 },
      new Date(2026, 7, 10),
    );

    // Meta de 20 min: o dia fecha assim que passa de 16 e aceita até 24.
    expect(result.map((item) => [item.id, item.scheduledDate])).toEqual([
      ['a', '2026-08-10'], ['b', '2026-08-10'], ['d', '2026-08-12'], ['c', '2026-08-17'],
    ]);
    // `d` foi antecipado porque `c` não cabia em dia nenhum da rotina.
    expect(result.find((item) => item.id === 'd')?.movedForFit).toBe(true);
    expect(result.find((item) => item.id === 'c')?.overBudget).toBe(true);
  });

  it('sends longer content to the day with more time', () => {
    const result = schedulePendingItems(
      [
        pending('longa', 80, { courseId: 'c1', sequence: 1 }),
        pending('media', 20, { courseId: 'c2', sequence: 1 }),
        pending('curta', 10, { courseId: 'c2', sequence: 2 }),
      ],
      { weekdays: [1, 6], minutesPerSession: 30, mode: 'per_day', minutesByWeekday: { 1: 30, 6: 90 } },
      new Date(2026, 7, 10),
    );

    const scheduledFor = (id: string) => result.find((item) => item.id === id)?.scheduledDate;
    expect(scheduledFor('media')).toBe('2026-08-10');
    expect(scheduledFor('curta')).toBe('2026-08-10');
    // Sábado tem 90 minutos declarados: é lá que a aula longa cabe sem estourar.
    expect(scheduledFor('longa')).toBe('2026-08-15');
    expect(result.find((item) => item.id === 'longa')?.overBudget).toBeFalsy();
    expect(weeklyMinutes({ weekdays: [1, 6], minutesPerSession: 30, mode: 'per_day', minutesByWeekday: { 1: 30, 6: 90 } })).toBe(120);
  });

  it('reorders across courses to fill a day but never inside a course', () => {
    const result = schedulePendingItems(
      [
        pending('c1-aula1', 50, { courseId: 'c1', sequence: 1 }),
        pending('c1-aula2', 5, { courseId: 'c1', sequence: 2 }),
        pending('artigo', 5, { type: 'article' }),
      ],
      { weekdays: [1, 3], minutesPerSession: 20 },
      new Date(2026, 7, 10),
    );

    // O artigo é antecipado; a aula 2 continua depois da aula 1 do mesmo curso.
    expect(result.map((item) => item.id)).toEqual(['artigo', 'c1-aula1', 'c1-aula2']);
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

  it('brings back content that an old trail had removed from the agenda', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    /*
     * Trilha gravada quando excluir conteúdo ainda existia. Regerar não pode
     * herdar a exclusão: o aluno perderia para sempre uma aula que a curadoria
     * considera essencial.
     */
    const legacy = {
      ...trail,
      items: trail.items.filter((item) => item.id !== 'l2'),
      excludedItems: [trail.items.find((item) => item.id === 'l2')!],
    };

    const regenerated = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, legacy, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    expect(regenerated.items.some((item) => item.id === 'l2')).toBe(true);
    expect(regenerated.excludedItems).toBeUndefined();
  });
  it('never schedules content the person already finished elsewhere', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX, ['l1', 'l2']);

    expect(trail.items.map((item) => item.id)).toEqual(['l-profile-1']);
  });

  it('marks trail content completed outside the agenda instead of replanning it', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    const synced = syncTrailCompletion(trail, ['l1'], new Date(2026, 7, 11));
    expect(synced.changed).toBe(true);
    expect(synced.trail.items.find((item) => item.id === 'l1')?.status).toBe('completed');
    expect(syncTrailCompletion(synced.trail, ['l1']).changed).toBe(false);
  });

  it('eases the daily target after two blank days', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3, 5], minutesPerSession: 30 }, undefined, new Date(2026, 7, 3), TRAIL_CONTENT_INDEX);

    const result = replanLearningTrail(trail, new Date(2026, 7, 10));
    expect(result.missedSessions).toBe(2);
    expect(result.easedMinutes).toBe(24);
    expect(result.trail.adaptiveMinutesPerSession).toBe(24);
    expect(result.trail.missedSessions).toBe(2);

    // Um único dia em branco a mais não dispara outro alívio.
    const again = replanLearningTrail(
      { ...result.trail, items: result.trail.items.map((item) => ({ ...item, scheduledDate: '2026-08-10' })) },
      new Date(2026, 7, 12),
    );
    expect(again.easedMinutes).toBeNull();
    expect(again.trail.adaptiveMinutesPerSession).toBe(24);
  });

  it('resets the blank-day counter when the person rates a session again', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);
    const withMisses = { ...trail, missedSessions: 3 };
    const rated = applySessionFeedback(withMisses, trail.items[0].sessionId, 'right', new Date(2026, 7, 10));
    expect(rated.missedSessions).toBe(0);
  });
});
