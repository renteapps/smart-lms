import { logQueryError, type DB, type Row } from "./types";

export type RatingSummary = {
  averageRating: number | null;
  ratingsCount: number;
};

function mapRatingSummary(row: Row): RatingSummary {
  const ratingsCount = Number(row.ratings_count ?? 0);

  return {
    averageRating:
      ratingsCount > 0 && row.average_rating != null
        ? Number(row.average_rating)
        : null,
    ratingsCount,
  };
}

export function mapCourseRatingSummaries(rows: Row[]): Record<string, RatingSummary> {
  return Object.fromEntries(
    rows.map((row) => [row.course_id, mapRatingSummary(row)]),
  );
}

export function mapLessonRatingSummaries(rows: Row[]): Record<string, RatingSummary> {
  return Object.fromEntries(
    rows.map((row) => [row.lesson_id, mapRatingSummary(row)]),
  );
}

export async function getCourseRatingSummaries(db: DB): Promise<Record<string, RatingSummary>> {
  const { data, error } = await db
    .from("v_admin_course_rating_metrics")
    .select("course_id, average_rating, ratings_count");

  logQueryError("getCourseRatingSummaries", error);
  return mapCourseRatingSummaries(data ?? []);
}

export async function getLessonRatingSummaries(
  db: DB,
  courseId: string,
): Promise<Record<string, RatingSummary>> {
  const { data, error } = await db
    .from("v_admin_lesson_rating_metrics")
    .select("lesson_id, average_rating, ratings_count")
    .eq("course_id", courseId);

  logQueryError("getLessonRatingSummaries", error);
  return mapLessonRatingSummaries(data ?? []);
}
