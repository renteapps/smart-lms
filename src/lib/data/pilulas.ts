import type { Pilula, PilulaFormat, PilulaStatus } from "@/types/pilula";
import { logQueryError, type DB, type Row } from "./types";

const PILULA_SELECT = `
  id, title, category, format, summary, challenge, estimated_minutes, media_url,
  course_id, course_title, publish_date, status, created_at, updated_at
`;

export function mapPilula(row: Row, completions = 0, likes = 0): Pilula {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "Geral",
    format: (row.format ?? "texto") as PilulaFormat,
    summary: row.summary ?? "",
    challenge: row.challenge ?? "",
    estimatedMinutes: row.estimated_minutes ?? 3,
    mediaUrl: row.media_url ?? undefined,
    courseTitle: row.course_title ?? undefined,
    publishDate: row.publish_date ?? undefined,
    status: (row.status ?? "Rascunho") as PilulaStatus,
    completionsCount: completions,
    likesCount: likes,
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
  set("status", pilula.status);
  return row;
}

/** Contadores são COUNT() das interações — nunca inteiros que dessincronizam. */
async function getInteractionCounts(db: DB) {
  const { data, error } = await db.from("pilula_interactions").select("pilula_id, completed, liked");
  logQueryError("getInteractionCounts", error);

  const completions = new Map<string, number>();
  const likes = new Map<string, number>();
  (data ?? []).forEach((row: Row) => {
    if (row.completed) completions.set(row.pilula_id, (completions.get(row.pilula_id) ?? 0) + 1);
    if (row.liked) likes.set(row.pilula_id, (likes.get(row.pilula_id) ?? 0) + 1);
  });
  return { completions, likes };
}

export async function getPilulas(db: DB, onlyActive = false): Promise<Pilula[]> {
  let query = db.from("pilulas").select(PILULA_SELECT).order("created_at", { ascending: false });
  if (onlyActive) query = query.eq("status", "Ativa");

  const [{ data, error }, counts] = await Promise.all([query, getInteractionCounts(db)]);
  logQueryError("getPilulas", error);

  return (data ?? []).map((row: Row) =>
    mapPilula(row, counts.completions.get(row.id) ?? 0, counts.likes.get(row.id) ?? 0),
  );
}

export async function getPilulaById(db: DB, id: string): Promise<Pilula | null> {
  const { data, error } = await db.from("pilulas").select(PILULA_SELECT).eq("id", id).maybeSingle();
  logQueryError("getPilulaById", error);
  return data ? mapPilula(data) : null;
}

/**
 * A pílula do dia: entre as ativas cuja data de publicação já chegou, a mais
 * recente. Determinística de propósito — todo mundo vê a mesma no mesmo dia.
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
