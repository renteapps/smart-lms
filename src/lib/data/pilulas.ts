import type { Pilula, PilulaFormat, PilulaStatus } from "@/types/pilula";
import { normalizeTag } from "@/lib/matching";
import { logQueryError, type DB, type Row } from "./types";

const PILULA_SELECT = `
  id, title, category, format, summary, challenge, estimated_minutes, media_url,
  course_id, course_title, publish_date, days_after_signup, target_tags, status, created_at, updated_at
`;

export function mapPilula(row: Row, completions = 0, likes = 0, dismissals = 0): Pilula {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "Geral",
    format: (row.format ?? "texto") as PilulaFormat,
    summary: row.summary ?? "",
    challenge: row.challenge ?? "",
    estimatedMinutes: row.estimated_minutes ?? 3,
    mediaUrl: row.media_url ?? undefined,
    courseId: row.course_id ?? undefined,
    courseTitle: row.course_title ?? undefined,
    publishDate: row.publish_date ?? undefined,
    daysAfterSignup: row.days_after_signup !== null && row.days_after_signup !== undefined ? Number(row.days_after_signup) : null,
    targetTags: Array.isArray(row.target_tags) ? row.target_tags : [],
    status: (row.status ?? "Rascunho") as PilulaStatus,
    completionsCount: completions,
    likesCount: likes,
    dismissalsCount: dismissals,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function pilulaToRow(pilula: Partial<Pilula> & { courseId?: string | null }): Row {
  const row: Row = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) row[key] = value;
  };

  set("title", pilula.title);
  set("category", pilula.category);
  set("format", pilula.format);
  set("summary", pilula.summary);
  set("challenge", pilula.challenge);
  set("estimated_minutes", pilula.estimatedMinutes);
  set("media_url", pilula.mediaUrl ?? null);
  set("course_id", pilula.courseId ?? null);
  set("course_title", pilula.courseTitle ?? null);
  set("publish_date", pilula.publishDate || null);
  set("days_after_signup", pilula.daysAfterSignup !== undefined ? pilula.daysAfterSignup : null);
  set("target_tags", Array.isArray(pilula.targetTags) ? pilula.targetTags : []);
  set("status", pilula.status);
  return row;
}

/** Contadores são COUNT() das interações — nunca inteiros que dessincronizam. */
async function getInteractionCounts(db: DB) {
  const { data, error } = await db.from("pilula_interactions").select("pilula_id, completed, liked, dismissed");
  logQueryError("getInteractionCounts", error);

  const completions = new Map<string, number>();
  const likes = new Map<string, number>();
  const dismissals = new Map<string, number>();
  (data ?? []).forEach((row: Row) => {
    if (row.completed) completions.set(row.pilula_id, (completions.get(row.pilula_id) ?? 0) + 1);
    if (row.liked) likes.set(row.pilula_id, (likes.get(row.pilula_id) ?? 0) + 1);
    if (row.dismissed) dismissals.set(row.pilula_id, (dismissals.get(row.pilula_id) ?? 0) + 1);
  });
  return { completions, likes, dismissals };
}

export async function getPilulas(db: DB, onlyActive = false): Promise<Pilula[]> {
  let query = db.from("pilulas").select(PILULA_SELECT).order("created_at", { ascending: false });
  if (onlyActive) query = query.eq("status", "Ativa");

  const [{ data, error }, counts] = await Promise.all([query, getInteractionCounts(db)]);
  logQueryError("getPilulas", error);

  return (data ?? []).map((row: Row) =>
    mapPilula(
      row,
      counts.completions.get(row.id) ?? 0,
      counts.likes.get(row.id) ?? 0,
      counts.dismissals.get(row.id) ?? 0,
    ),
  );
}

export async function getPilulaById(db: DB, id: string): Promise<Pilula | null> {
  const { data, error } = await db.from("pilulas").select(PILULA_SELECT).eq("id", id).maybeSingle();
  logQueryError("getPilulaById", error);
  return data ? mapPilula(data) : null;
}

/**
 * A pílula padrão global: entre as ativas cuja data de publicação já chegou, a mais
 * recente.
 */
export async function getDailyPilula(db: DB): Promise<Pilula | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from("pilulas")
    .select(PILULA_SELECT)
    .eq("status", "Ativa")
    .or(`publish_date.is.null,publish_date.lte.${today}`)
    .order("publish_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  logQueryError("getDailyPilula", error);
  return data ? mapPilula(data) : null;
}

/**
 * Seleciona a pílula mais relevante para o aluno autenticado:
 * 1. Respeita tempo de cadastro (days_after_signup <= dias do aluno);
 * 2. Prioriza pílulas com tags que coincidem com as respostas de onboarding do aluno;
 * 3. Oculta pílulas já concluídas ou dispensadas (dismissed) pelo aluno;
 * 4. Permanece ativa na tela do aluno até que ele a conclua ou dispense.
 */
export async function getDailyPilulaForUser(db: DB, userId?: string | null): Promise<Pilula | null> {
  if (!userId) {
    return getDailyPilula(db);
  }

  const today = new Date().toISOString().slice(0, 10);

  // Busca perfil, questionário/trilha e histórico de interações do aluno em paralelo
  const [profileRes, trailRes, interactionsRes, questionnaireRes, candidatesRes] = await Promise.all([
    db.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
    db.from("student_trails").select("questionnaire_data").eq("user_id", userId).maybeSingle(),
    db.from("pilula_interactions").select("pilula_id, completed, dismissed").eq("user_id", userId),
    db.from("trail_questionnaires").select("questions").eq("status", "published").maybeSingle(),
    db.from("pilulas")
      .select(PILULA_SELECT)
      .eq("status", "Ativa")
      .or(`publish_date.is.null,publish_date.lte.${today}`),
  ]);

  logQueryError("getDailyPilulaForUser.candidates", candidatesRes.error);

  const candidates: Row[] = candidatesRes.data ?? [];
  if (candidates.length === 0) return null;

  // 1. Identifica IDs de pílulas já concluídas ou dispensadas pelo aluno
  const inactivePillIds = new Set<string>();
  (interactionsRes.data ?? []).forEach((row: { pilula_id: string; completed?: boolean; dismissed?: boolean }) => {
    if (row.completed || row.dismissed) {
      inactivePillIds.add(row.pilula_id);
    }
  });

  // 2. Calcula os dias de cadastro do aluno
  const userCreatedAt = profileRes.data?.created_at ? new Date(profileRes.data.created_at) : new Date();
  const daysSinceSignup = Math.max(0, Math.floor((Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24)));

  // 3. Coleta tags do aluno a partir das respostas do questionário
  const userTags = new Set<string>();
  const answers = (trailRes.data?.questionnaire_data as { answers?: Record<string, string[]> })?.answers || {};
  const questions = (questionnaireRes.data?.questions as Array<{ id: string; options: Array<{ label: string; tags?: string[] }> }>) || [];

  // Mapeia opções marcadas para tags reais autoradas
  questions.forEach((q) => {
    const selected = answers[q.id] || [];
    q.options.forEach((opt) => {
      if (selected.includes(opt.label)) {
        userTags.add(normalizeTag(opt.label));
        (opt.tags || []).forEach((t) => userTags.add(normalizeTag(t)));
      }
    });
  });

  // 4. Filtra e pontua candidatos
  const eligible = candidates.filter((c) => {
    // Descarta já concluídas ou dispensadas
    if (inactivePillIds.has(c.id)) return false;

    // Gatilho de tempo de cadastro (se definido, aluno precisa ter pelo menos X dias)
    if (c.days_after_signup !== null && c.days_after_signup !== undefined) {
      if (daysSinceSignup < Number(c.days_after_signup)) {
        return false;
      }
    }

    // Gatilho de tags de resposta (se a pílula exige tags específicas, o aluno deve ter pelo menos uma)
    const pillTags: string[] = Array.isArray(c.target_tags) ? c.target_tags : [];
    if (pillTags.length > 0) {
      const hasMatchingTag = pillTags.some((pt) => userTags.has(normalizeTag(pt)));
      if (!hasMatchingTag) return false;
    }

    return true;
  });

  if (eligible.length === 0) {
    return null;
  }

  // 5. Ordena por relevância
  eligible.sort((a, b) => {
    const aTags: string[] = Array.isArray(a.target_tags) ? a.target_tags : [];
    const bTags: string[] = Array.isArray(b.target_tags) ? b.target_tags : [];
    
    // Prioridade 1: Pílula que combina com as tags do onboarding
    const aTagMatches = aTags.filter((t) => userTags.has(normalizeTag(t))).length;
    const bTagMatches = bTags.filter((t) => userTags.has(normalizeTag(t))).length;
    if (aTagMatches !== bTagMatches) {
      return bTagMatches - aTagMatches;
    }

    // Prioridade 2: Pílula com gatilho de tempo de cadastro específico
    const aDays = a.days_after_signup ?? -1;
    const bDays = b.days_after_signup ?? -1;
    if (aDays !== bDays) {
      return bDays - aDays;
    }

    // Prioridade 3: Data de criação/publicação mais recente
    const aTime = new Date(a.publish_date || a.created_at).getTime();
    const bTime = new Date(b.publish_date || b.created_at).getTime();
    return bTime - aTime;
  });

  return mapPilula(eligible[0]);
}
