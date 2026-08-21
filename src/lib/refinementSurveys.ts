import type { LearningTrail, Question, Questionnaire } from '@/types/trilha';
import type { ProfileTest } from '@/types/profileTest';
import type { HomeState, ImplicitSignals } from '@/lib/studentHome';
import type { ProfileTestResult } from '@/lib/data/profileTests';
import { EMPTY_REFINEMENT, type RefinementState } from '@/lib/data/trail';

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

/** Conclusões necessárias antes de reabrir uma pergunta já respondida. */
const COMPLETIONS_BETWEEN_SURVEYS = 3;
/** Dias de silêncio depois de responder uma micro-pesquisa. */
const COOLDOWN_DAYS = 7;
/**
 * Dias de silêncio entre uma exibição e outra de uma pergunta ainda sem
 * resposta. Ela continua tendo prioridade sobre tudo — falta um pedaço do
 * perfil enquanto ninguém responder —, mas não precisa insistir em toda visita
 * à home; espaçada, ela para de parecer uma cobrança diária.
 */
const UNANSWERED_RENAG_DAYS = 3;
const DAY_IN_MS = 86_400_000;

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
      /** Pergunta que entrou no questionário depois desta pessoa — nunca respondida. */
      isNew: boolean;
    }
  | { kind: 'profile-test'; test: ProfileTest; reason: string };

export type PickRecalibrationOptions = {
  state: HomeState;
  questionnaire: Questionnaire | null;
  signals: ImplicitSignals;
  refinement?: RefinementState;
  profileTests?: ProfileTest[];
  profileTestResults?: ProfileTestResult[];
  now?: Date;
};

function surveyIsDue(
  question: Question,
  trail: LearningTrail,
  signals: ImplicitSignals,
  refinement: RefinementState,
  now: Date,
): { due: boolean; reason: string; isNew: boolean } {
  const answered = trail.answers?.[question.id];

  // Pergunta que entrou no questionário depois do onboarding desta pessoa.
  if (!answered || answered.length === 0) {
    const lastShown = refinement.shownAt?.[question.id];
    if (lastShown) {
      const elapsed = now.getTime() - new Date(lastShown).getTime();
      if (Number.isFinite(elapsed) && elapsed < UNANSWERED_RENAG_DAYS * DAY_IN_MS) {
        return { due: false, reason: '', isNew: true };
      }
    }
    return { due: true, reason: 'Esta pergunta é nova desde que você montou sua trilha.', isNew: true };
  }

  const lastAsked = refinement.answeredAt[question.id];
  if (lastAsked) {
    const elapsed = now.getTime() - new Date(lastAsked).getTime();
    if (Number.isFinite(elapsed) && elapsed < COOLDOWN_DAYS * DAY_IN_MS) {
      return { due: false, reason: '', isNew: false };
    }
  }

  if (signals.completedCount - refinement.completedAtLastSurvey < COMPLETIONS_BETWEEN_SURVEYS) {
    return { due: false, reason: '', isNew: false };
  }

  return {
    due: true,
    reason: `Você concluiu ${signals.completedCount} conteúdos desde o início. Ainda faz sentido?`,
    isNew: false,
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
  refinement = EMPTY_REFINEMENT,
  profileTests = [],
  profileTestResults = [],
  now = new Date(),
}: PickRecalibrationOptions): Recalibration | null {
  if (state.kind === 'sem-trilha') return null;

  const { trail } = state;
  const questions = questionnaire?.questions || [];

  /*
   * 0. Pergunta que entrou no questionário depois desta pessoa.
   *
   * Vem antes de tudo e não espera a sessão do dia: enquanto ela não for
   * respondida, a trilha está sendo montada com um pedaço a menos do perfil. As
   * demais recalibrações são refinamento de algo que já existe; esta é o que
   * falta. Mas "prioridade" não é "toda visita" — `surveyIsDue` espaça as
   * exibições em `UNANSWERED_RENAG_DAYS` dias, então uma pergunta ignorada
   * ontem não insiste hoje de novo.
   */
  for (const question of questions) {
    if (question.type === 'availability') continue;
    if ((trail.answers?.[question.id]?.length ?? 0) > 0) continue;

    const { due, reason, isNew } = surveyIsDue(question, trail, signals, refinement, now);
    if (due) return { kind: 'survey', question, current: [], reason, isNew };
  }

  if (state.kind === 'dia-pronto' && state.session.done.length === 0) return null;

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
  const ordered = signals.lateRate >= 0.5
    ? [...questions].sort((a, b) => (
      Number(b.type === 'availability') - Number(a.type === 'availability')
    ))
    : questions;

  for (const question of ordered) {
    // A disponibilidade tem tela própria em /minha-trilha ("Ajustar rotina").
    if (question.type === 'availability') continue;

    const { due, reason, isNew } = surveyIsDue(question, trail, signals, refinement, now);
    if (due) {
      return { kind: 'survey', question, current: trail.answers?.[question.id] || [], reason, isNew };
    }
  }

  // 3. Teste de perfil ainda não respondido.
  const pending = profileTests.find(
    (test) => test.status === 'published'
      && test.questions.length > 0
      && !profileTestResults.some((entry) => entry.testId === test.id),
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

export const REFINEMENT_STORAGE_KEY = '@smartlms:refinement:v1';

export function readRefinementState(raw?: string | null): RefinementState {
  if (!raw) return EMPTY_REFINEMENT;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : EMPTY_REFINEMENT;
  } catch {
    return EMPTY_REFINEMENT;
  }
}

export function recordSurveyAnswer(
  questionId: string,
  completedCount: number,
  now: Date = new Date(),
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(REFINEMENT_STORAGE_KEY);
    const current = readRefinementState(raw);
    const updated: RefinementState = {
      formatVersion: 1,
      answeredAt: { ...current.answeredAt, [questionId]: now.toISOString() },
      completedAtLastSurvey: completedCount,
      shownAt: current.shownAt,
    };
    window.localStorage.setItem(REFINEMENT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao registrar resposta de pesquisa:', err);
  }
}

/**
 * Registra que o card de "pergunta nova" apareceu — respondida ou não.
 *
 * É o que dá o espaçamento: sem gravar a exibição em si, só `recordSurveyAnswer`
 * (chamado ao responder) atualizaria o relógio, e quem ignora o card continuaria
 * vendo-o em toda visita.
 */
export function recordSurveyShown(questionId: string, now: Date = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(REFINEMENT_STORAGE_KEY);
    const current = readRefinementState(raw);
    const updated: RefinementState = {
      ...current,
      shownAt: { ...(current.shownAt ?? {}), [questionId]: now.toISOString() },
    };
    window.localStorage.setItem(REFINEMENT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao registrar exibição de pergunta:', err);
  }
}
