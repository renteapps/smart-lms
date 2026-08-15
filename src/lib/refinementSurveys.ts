import type { LearningTrail, Question, Questionnaire } from '@/types/trilha';
import type { ProfileTest } from '@/types/profileTest';
import type { HomeState, ImplicitSignals } from '@/lib/studentHome';
import { readProfileTestResults, type ProfileTestResults } from '@/lib/profileTestStorage';

/**
 * Recalibração: as "pesquisas seguintes".
 *
 * Quatro sinais realimentam a trilha, e **no máximo um** aparece por vez. Um
 * painel que pergunta três coisas ao mesmo tempo recria exatamente a poluição
 * que a nova home existe para remover.
 *
 * As micro-pesquisas reaproveitam perguntas do próprio questionário publicado —
 * não inventam perguntas novas. Isso importa porque `generateLearningTrail` só
 * enxerga conteúdo mapeado nas opções do questionário: uma pergunta inédita
 * geraria uma resposta que o motor ignoraria, e a trilha não mudaria.
 */

export const REFINEMENT_STORAGE_KEY = '@smartlms:refinement:v1';

/** Conclusões necessárias antes de reabrir uma pergunta já respondida. */
const COMPLETIONS_BETWEEN_SURVEYS = 3;
/** Dias de silêncio depois de responder uma micro-pesquisa. */
const COOLDOWN_DAYS = 7;
const DAY_IN_MS = 86_400_000;

export type RefinementState = {
  formatVersion: 1;
  /** questionId -> ISO da última vez que a pessoa revisitou a pergunta. */
  answeredAt: Record<string, string>;
  /** Conclusões registradas na última vez que perguntamos algo. */
  completedAtLastSurvey: number;
};

function empty(): RefinementState {
  return { formatVersion: 1, answeredAt: {}, completedAtLastSurvey: 0 };
}

export function readRefinementState(rawInput?: string | null): RefinementState {
  if (rawInput === undefined && typeof window === 'undefined') return empty();
  const raw = rawInput === undefined ? window.localStorage.getItem(REFINEMENT_STORAGE_KEY) : rawInput;
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw) as RefinementState;
    return parsed.formatVersion === 1 && parsed.answeredAt ? parsed : empty();
  } catch {
    return empty();
  }
}

export function recordSurveyAnswer(questionId: string, completedCount: number, now = new Date()): void {
  if (typeof window === 'undefined') return;
  const current = readRefinementState();
  window.localStorage.setItem(
    REFINEMENT_STORAGE_KEY,
    JSON.stringify({
      formatVersion: 1,
      answeredAt: { ...current.answeredAt, [questionId]: now.toISOString() },
      completedAtLastSurvey: completedCount,
    } satisfies RefinementState),
  );
}

// ---------------------------------------------------------------------------

export type Recalibration =
  | {
      kind: 'session-feedback';
      sessionId: string;
      plannedMinutes: number;
      currentTargetMinutes: number;
    }
  | {
      kind: 'survey';
      question: Question;
      /** Respostas atuais, para o formulário abrir já preenchido. */
      current: string[];
      reason: string;
    }
  | { kind: 'profile-test'; test: ProfileTest; reason: string };

export type PickRecalibrationOptions = {
  state: HomeState;
  questionnaire: Questionnaire | null;
  signals: ImplicitSignals;
  refinement: RefinementState;
  profileTests?: ProfileTest[];
  profileTestResults?: ProfileTestResults;
  now?: Date;
};

function surveyIsDue(
  question: Question,
  trail: LearningTrail,
  signals: ImplicitSignals,
  refinement: RefinementState,
  now: Date,
): { due: boolean; reason: string } {
  const answered = trail.answers?.[question.id];

  // Pergunta que entrou no questionário depois do onboarding desta pessoa.
  if (!answered || answered.length === 0) {
    return { due: true, reason: 'Esta pergunta é nova desde que você montou sua trilha.' };
  }

  const lastAsked = refinement.answeredAt[question.id];
  if (lastAsked) {
    const elapsed = now.getTime() - new Date(lastAsked).getTime();
    if (Number.isFinite(elapsed) && elapsed < COOLDOWN_DAYS * DAY_IN_MS) {
      return { due: false, reason: '' };
    }
  }

  if (signals.completedCount - refinement.completedAtLastSurvey < COMPLETIONS_BETWEEN_SURVEYS) {
    return { due: false, reason: '' };
  }

  return {
    due: true,
    reason: `Você concluiu ${signals.completedCount} conteúdos desde o início. Ainda faz sentido?`,
  };
}

/**
 * Escolhe o único cartão de recalibração da vez.
 *
 * Nunca antes de estudar: pedir calibração para quem ainda não começou a sessão
 * do dia transforma o painel numa fila de formulários.
 */
export function pickRecalibration({
  state,
  questionnaire,
  signals,
  refinement,
  profileTests = [],
  profileTestResults,
  now = new Date(),
}: PickRecalibrationOptions): Recalibration | null {
  if (state.kind === 'sem-trilha') return null;
  if (state.kind === 'dia-pronto' && state.session.done.length === 0) return null;

  const { trail } = state;

  // 1. Feedback da sessão que acabou de fechar.
  if (state.kind === 'dia-concluido') {
    const alreadyRated = (trail.feedbackHistory || []).some(
      (entry) => entry.sessionId === state.session.sessionId,
    );
    if (!alreadyRated && state.session.done.length > 0) {
      return {
        kind: 'session-feedback',
        sessionId: state.session.sessionId,
        plannedMinutes: state.session.totalMinutes,
        currentTargetMinutes: trail.adaptiveMinutesPerSession || trail.availability.minutesPerSession,
      };
    }
  }

  // 2. Micro-pesquisa. Atraso alto puxa a pergunta de disponibilidade para a
  //    frente: não adianta refinar interesses de quem não está dando conta do
  //    tamanho da sessão.
  const questions = questionnaire?.questions || [];
  const ordered = signals.lateRate >= 0.5
    ? [...questions].sort((a, b) => (
      Number(b.type === 'availability') - Number(a.type === 'availability')
    ))
    : questions;

  for (const question of ordered) {
    // A disponibilidade tem tela própria em /minha-trilha ("Ajustar rotina").
    if (question.type === 'availability') continue;

    const { due, reason } = surveyIsDue(question, trail, signals, refinement, now);
    if (due) {
      return { kind: 'survey', question, current: trail.answers?.[question.id] || [], reason };
    }
  }

  // 3. Teste de perfil ainda não respondido.
  const results = profileTestResults ?? readProfileTestResults();
  const pending = profileTests.find(
    (test) => test.status === 'published'
      && test.questions.length > 0
      && !results.results.some((entry) => entry.testId === test.id),
  );

  if (pending) {
    return {
      kind: 'profile-test',
      test: pending,
      reason: 'Um diagnóstico curto para afinar as recomendações.',
    };
  }

  return null;
}
