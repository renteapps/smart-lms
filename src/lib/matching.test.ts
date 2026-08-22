import { describe, expect, it } from 'vitest';
import { applySessionFeedback, generateLearningTrail, postponeTrailItem, postponeTrailSession, replanLearningTrail, schedulePendingItems, syncTrailCompletion, updateTrailAvailability, validateQuestionnaire, weeklyMinutes } from './matching';
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
    // `c` tem 25 e não cabe em dia nenhum da rotina — na vez dele leva o dia
    // inteiro, em vez de ceder o lugar a `d` e esperar a fila esvaziar.
    expect(result.map((item) => [item.id, item.scheduledDate])).toEqual([
      ['a', '2026-08-10'], ['b', '2026-08-10'], ['c', '2026-08-12'], ['d', '2026-08-17'],
    ]);
    expect(result.find((item) => item.id === 'c')?.overBudget).toBe(true);
  });

  it('keeps content longer than the daily target in its curated turn', () => {
    const result = schedulePendingItems(
      [
        pending('masterclass', 60, { courseId: 'galeria', sequence: 1 }),
        pending('aula-1', 15, { courseId: 'c1', sequence: 1 }),
        pending('aula-2', 15, { courseId: 'c1', sequence: 2 }),
        pending('aula-3', 15, { courseId: 'c1', sequence: 3 }),
      ],
      { weekdays: [1, 3], minutesPerSession: 30 },
      new Date(2026, 7, 10),
    );

    const masterclass = result.find((item) => item.id === 'masterclass');
    /*
     * Uma aula de curso galeria com 60 minutos numa rotina de 30 entra na
     * agenda, e no lugar dela: antes o preenchimento sempre achava algo mais
     * curto para pôr no dia e a empurrava até o fim da trilha.
     */
    expect(masterclass?.scheduledDate).toBe('2026-08-10');
    expect(masterclass?.overBudget).toBe(true);
    // Sozinha na sessão — é o que o aviso do card promete.
    expect(result.filter((item) => item.sessionId === masterclass?.sessionId)).toHaveLength(1);
    expect(result.find((item) => item.id === 'aula-1')?.scheduledDate).toBe('2026-08-12');
  });

  it('never lets shorter content from another course pass content that does not fit the day', () => {
    /*
     * A rotina e as durações de uma trilha real: 20/20/25 minutos por dia, uma
     * coleção de masterclasses de 27 e 63 minutos e um curso de aulas curtas.
     * Nenhuma masterclass cabe na meta de um dia — e enquanto o dia era montado
     * só por encaixe, as aulas curtas passavam na frente toda semana e a
     * coleção inteira escorregava para o fim do plano.
     */
    const result = schedulePendingItems(
      [
        pending('masterclass-1', 27, { courseId: 'galeria', sequence: 1 }),
        pending('curta-1', 5, { courseId: 'negociacao', sequence: 1 }),
        pending('curta-2', 6, { courseId: 'negociacao', sequence: 2 }),
        pending('masterclass-2', 63, { courseId: 'galeria', sequence: 2 }),
      ],
      { weekdays: [1, 3, 6], minutesPerSession: 20, mode: 'per_day', minutesByWeekday: { 1: 20, 3: 20, 6: 25 } },
      new Date(2026, 7, 10),
    );

    expect(result.map((item) => item.id)).toEqual(['masterclass-1', 'curta-1', 'curta-2', 'masterclass-2']);

    const scheduledFor = (id: string) => result.find((item) => item.id === id)?.scheduledDate;
    // Segunda abre com a masterclass, não com as aulas curtas que caberiam nela.
    expect(scheduledFor('masterclass-1')).toBe('2026-08-10');
    expect(scheduledFor('curta-1')).toBe('2026-08-12');
    expect(scheduledFor('masterclass-2')).toBe('2026-08-15');

    // O dia ficou maior que a meta, e é isso que o card avisa.
    expect(result.find((item) => item.id === 'masterclass-1')?.overBudget).toBe(true);
    expect(result.find((item) => item.id === 'masterclass-2')?.overBudget).toBe(true);
    // Furar a meta é privilégio de quem abre a sessão: ela não recebe mais nada.
    expect(result.filter((item) => item.scheduledDate === '2026-08-10')).toHaveLength(1);
  });

  it('gives the day with more declared time more content', () => {
    const result = schedulePendingItems(
      [1, 2, 3, 4, 5, 6].map((n) => pending(`aula-${n}`, 15, { courseId: 'c1', sequence: n })),
      { weekdays: [1, 6], minutesPerSession: 30, mode: 'per_day', minutesByWeekday: { 1: 30, 6: 90 } },
      new Date(2026, 7, 10),
    );

    const minutesOn = (date: string) => result
      .filter((item) => item.scheduledDate === date)
      .reduce((total, item) => total + item.durationMin, 0);

    // Segunda tem 30 minutos declarados; sábado, 90. Cada dia enche até a meta dele.
    expect(minutesOn('2026-08-10')).toBe(30);
    expect(minutesOn('2026-08-15')).toBe(60);
    expect(weeklyMinutes({ weekdays: [1, 6], minutesPerSession: 30, mode: 'per_day', minutesByWeekday: { 1: 30, 6: 90 } })).toBe(120);
  });

  it('reorders across courses to fill a day but never inside a course', () => {
    const result = schedulePendingItems(
      [
        pending('c1-aula1', 12, { courseId: 'c1', sequence: 1 }),
        pending('c1-aula2', 20, { courseId: 'c1', sequence: 2 }),
        pending('artigo', 5, { type: 'article' }),
      ],
      { weekdays: [1, 3], minutesPerSession: 20 },
      new Date(2026, 7, 10),
    );

    // A aula 2 não cabia no que sobrou da segunda: o artigo é antecipado para
    // fechar o dia, e ela continua depois da aula 1 do mesmo curso.
    expect(result.map((item) => item.id)).toEqual(['c1-aula1', 'artigo', 'c1-aula2']);
    expect(result.find((item) => item.id === 'artigo')?.movedForFit).toBe(true);
    expect(result.find((item) => item.id === 'c1-aula2')?.scheduledDate).toBe('2026-08-12');
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

  it('postpones a single content without moving the rest of the session', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 60 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    const firstDate = trail.items[0].scheduledDate;
    const sameDay = trail.items.filter((item) => item.scheduledDate === firstDate);
    // O teste só faz sentido com mais de um conteúdo no mesmo dia.
    expect(sameDay.length).toBeGreaterThan(1);

    // Adia o último do dia: nada depois dele na sequência, então ele vai sozinho.
    const target = sameDay[sameDay.length - 1];
    const postponed = postponeTrailItem(trail, target.id);
    const moved = postponed.items.find((item) => item.id === target.id)!;

    expect(moved.scheduledDate).not.toBe(firstDate);
    expect(moved.rescheduled).toBe(true);
    // O resto do dia fica onde estava.
    sameDay.slice(0, -1).forEach((item) => {
      expect(postponed.items.find((next) => next.id === item.id)!.scheduledDate).toBe(firstDate);
    });
  });

  it('drags same-course successors so postponing never breaks the lesson order', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'], q_objetivo: ['Sair do zero com segurança'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 60 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    const firstDate = trail.items[0].scheduledDate;
    const sameDay = trail.items.filter((item) => item.scheduledDate === firstDate);
    const target = sameDay[0];
    const successors = sameDay.filter(
      (item) => item.id !== target.id
        && (item.courseId || item.moduleId) === (target.courseId || target.moduleId),
    );

    const postponed = postponeTrailItem(trail, target.id);
    const movedDate = postponed.items.find((item) => item.id === target.id)!.scheduledDate;

    successors.forEach((item) => {
      expect(postponed.items.find((next) => next.id === item.id)!.scheduledDate).toBe(movedDate);
    });
  });

  it('leaves the trail untouched when the content is not pending', () => {
    const trail = generateLearningTrail('u1', {
      q_formato: ['Teoria Profunda (Conceitos base)'],
    }, mockQuestionnaire, { weekdays: [1, 3], minutesPerSession: 30 }, undefined, new Date(2026, 7, 10), TRAIL_CONTENT_INDEX);

    const done = { ...trail, items: trail.items.map((item, i) => (i === 0 ? { ...item, status: 'completed' as const } : item)) };
    expect(postponeTrailItem(done, done.items[0].id)).toBe(done);
    expect(postponeTrailItem(trail, 'nao-existe')).toBe(trail);
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
