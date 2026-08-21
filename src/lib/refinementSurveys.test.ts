import { describe, expect, it } from 'vitest';
import { pickRecalibration } from './refinementSurveys';
import { selectHomeState, type ImplicitSignals } from './studentHome';
import { generateLearningTrail } from './matching';
import { mockQuestionnaire, TRAIL_CONTENT_INDEX } from './seed/questionnaire';

const quietSignals: ImplicitSignals = {
  completedCount: 0,
  removedCount: 0,
  removedByRole: { essential: 0, deepening: 0, extra: 0 },
  rescheduledCount: 0,
  lateRate: 0,
  preferredHour: null,
};

const monday = new Date(2026, 7, 10);

describe('recalibração da trilha', () => {
  const trail = generateLearningTrail(
    'u1',
    { q_formato: ['Teoria Profunda (Conceitos base)'] },
    mockQuestionnaire,
    { weekdays: [1, 3], minutesPerSession: 30 },
    undefined,
    monday,
    TRAIL_CONTENT_INDEX,
  );

  it('pede a pergunta que a pessoa nunca respondeu, mesmo antes de estudar no dia', () => {
    const state = selectHomeState(trail, monday);
    expect(state.kind).toBe('dia-pronto');

    const recalibration = pickRecalibration({
      state,
      questionnaire: mockQuestionnaire,
      signals: quietSignals,
    });

    // Pergunta nova não espera a sessão do dia: sem ela a trilha está incompleta.
    expect(recalibration?.kind).toBe('survey');
    if (recalibration?.kind !== 'survey') throw new Error('esperava uma micro-pesquisa');
    expect(recalibration.question.id).toBe('q_objetivo');
    expect(recalibration.current).toEqual([]);
  });

  it('cala a boca quando tudo já foi respondido e o dia ainda não começou', () => {
    const answers = Object.fromEntries(
      mockQuestionnaire.questions
        .filter((question) => question.type !== 'availability')
        .map((question) => [question.id, [question.options[0].label]]),
    );
    const state = selectHomeState({ ...trail, answers }, monday);

    expect(pickRecalibration({
      state,
      questionnaire: mockQuestionnaire,
      signals: quietSignals,
    })).toBeNull();
  });
});
