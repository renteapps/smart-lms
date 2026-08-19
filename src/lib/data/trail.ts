import type { LearningTrail, Questionnaire, QuestionnaireVersion } from "@/types/trilha";
import type {
  TrailAnalyticsData,
  TrailAnalyticsEvent,
  TrailAnalyticsEventType,
} from "@/lib/trailAnalytics";
import { logQueryError, type DB, type Row } from "./types";

/** Questionário publicado — o único que o onboarding oferece. */
export async function getPublishedQuestionnaire(db: DB): Promise<Questionnaire | null> {
  const { data, error } = await db
    .from("trail_questionnaires")
    .select("version, status, questions")
    .eq("status", "published")
    .maybeSingle();

  logQueryError("getPublishedQuestionnaire", error);
  if (!data) return null;

  return {
    version: data.version,
    status: data.status as Questionnaire["status"],
    questions: data.questions ?? [],
  };
}

/** O rascunho em edição no admin — no máximo uma linha, garantida pelo índice único parcial. */
export async function getDraftQuestionnaire(db: DB): Promise<Questionnaire | null> {
  const { data, error } = await db
    .from("trail_questionnaires")
    .select("version, status, questions")
    .eq("status", "draft")
    .maybeSingle();

  logQueryError("getDraftQuestionnaire", error);
  if (!data) return null;

  return {
    version: data.version,
    status: data.status as Questionnaire["status"],
    questions: data.questions ?? [],
  };
}

/** Rascunho em edição no admin; cai para o publicado quando não há rascunho. */
export async function getEditableQuestionnaire(db: DB): Promise<Questionnaire | null> {
  const draft = await getDraftQuestionnaire(db);
  if (draft) return draft;
  return getPublishedQuestionnaire(db);
}

/** Histórico completo de versões, mais recente primeiro — alimenta o painel de histórico do admin. */
export async function listQuestionnaireVersions(db: DB): Promise<QuestionnaireVersion[]> {
  const { data, error } = await db
    .from("trail_questionnaires")
    .select("id, version, status, questions, notes, published_at, created_at, created_by")
    .order("version", { ascending: false });

  logQueryError("listQuestionnaireVersions", error);
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    version: row.version,
    status: row.status as Questionnaire["status"],
    questions: row.questions ?? [],
    notes: row.notes,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }));
}

// ---------------------------------------------------------------------------
// Trilha do aluno
// ---------------------------------------------------------------------------

export async function getLearningTrail(db: DB, userId: string): Promise<LearningTrail | null> {
  const { data, error } = await db
    .from("student_trails")
    .select("trail_data")
    .eq("user_id", userId)
    .maybeSingle();

  logQueryError("getLearningTrail", error);
  if (!data?.trail_data) return null;

  const trail = data.trail_data as LearningTrail;
  return trail.formatVersion === 3 && Array.isArray(trail.items) ? trail : null;
}

export async function saveLearningTrail(db: DB, userId: string, trail: LearningTrail): Promise<void> {
  const { error } = await db.from("student_trails").upsert(
    {
      user_id: userId,
      trail_data: trail,
      questionnaire_data: { version: trail.questionnaireVersion, answers: trail.answers },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message);
}

export async function deleteLearningTrail(db: DB, userId: string): Promise<void> {
  const { error } = await db.from("student_trails").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Telemetria
// ---------------------------------------------------------------------------

export async function recordTrailEvent(
  db: DB,
  userId: string,
  type: TrailAnalyticsEventType,
  payload?: TrailAnalyticsEvent["payload"],
): Promise<void> {
  const { error } = await db
    .from("trail_events")
    .insert({ user_id: userId, type, payload: payload ?? {} });

  // Telemetria nunca derruba o fluxo de quem está estudando.
  logQueryError("recordTrailEvent", error);
}

export async function getTrailAnalytics(db: DB, userId?: string): Promise<TrailAnalyticsData> {
  let query = db
    .from("trail_events")
    .select("id, type, payload, occurred_at")
    .order("occurred_at", { ascending: true })
    .limit(2000);

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  logQueryError("getTrailAnalytics", error);

  return {
    formatVersion: 1,
    events: (data ?? []).map((row: Row) => ({
      id: row.id,
      type: row.type as TrailAnalyticsEventType,
      occurredAt: row.occurred_at,
      payload: row.payload ?? undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// Recalibração
// ---------------------------------------------------------------------------

export type RefinementState = {
  formatVersion: 1;
  /** questionId -> ISO da última vez que a pessoa revisitou a pergunta. */
  answeredAt: Record<string, string>;
  /** Conclusões registradas na última vez que perguntamos algo. */
  completedAtLastSurvey: number;
};

export const EMPTY_REFINEMENT: RefinementState = {
  formatVersion: 1,
  answeredAt: {},
  completedAtLastSurvey: 0,
};

export async function getRefinementState(db: DB, userId: string): Promise<RefinementState> {
  const { data, error } = await db
    .from("student_refinements")
    .select("answered_at, completed_at_last_survey")
    .eq("user_id", userId)
    .maybeSingle();

  logQueryError("getRefinementState", error);
  if (!data) return EMPTY_REFINEMENT;

  return {
    formatVersion: 1,
    answeredAt: data.answered_at ?? {},
    completedAtLastSurvey: data.completed_at_last_survey ?? 0,
  };
}

export async function recordSurveyAnswer(
  db: DB,
  userId: string,
  questionId: string,
  completedCount: number,
  now = new Date(),
): Promise<void> {
  const current = await getRefinementState(db, userId);
  const { error } = await db.from("student_refinements").upsert(
    {
      user_id: userId,
      answered_at: { ...current.answeredAt, [questionId]: now.toISOString() },
      completed_at_last_survey: completedCount,
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message);
}
