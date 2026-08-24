import type { ProfileCategory, ProfileQuestion, ProfileTest } from "@/types/profileTest";
import { logQueryError, type DB, type Row } from "./types";

const TEST_SELECT = `
  id, slug, title, description, cover_url, status, result_type, 
  access_type, required_course_ids, required_plan_ids,
  categories, questions, created_at, updated_at
`;

export type ProfileTestScore = {
  categoryId: string;
  categoryName: string;
  percentage: number;
};

export type ProfileTestResult = {
  testId: string;
  testTitle: string;
  /** Categoria vencedora. */
  categoryId: string;
  categoryName: string;
  scores: ProfileTestScore[];
  completedAt: string;
};

export function mapProfileTest(row: Row, completions = 0): ProfileTest {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    coverUrl: row.cover_url ?? undefined,
    status: (row.status ?? "draft") as ProfileTest["status"],
    resultType: (row.result_type ?? "single") as ProfileTest["resultType"],
    accessType: (row.access_type ?? "logged_in") as ProfileTest["accessType"],
    requiredCourseIds: row.required_course_ids ?? [],
    requiredPlanIds: row.required_plan_ids ?? [],
    categories: (row.categories ?? []) as ProfileCategory[],
    questions: (row.questions ?? []) as ProfileQuestion[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completionsCount: completions,
  };
}

export function profileTestToRow(test: Partial<ProfileTest>): Row {
  const row: Row = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) row[key] = value;
  };

  set("slug", test.slug);
  set("title", test.title);
  set("description", test.description);
  set("cover_url", test.coverUrl ?? null);
  set("status", test.status);
  set("result_type", test.resultType);
  set("access_type", test.accessType);
  set("required_course_ids", test.requiredCourseIds);
  set("required_plan_ids", test.requiredPlanIds);
  set("categories", test.categories);
  set("questions", test.questions);
  return row;
}

async function getCompletionCounts(db: DB): Promise<Map<string, number>> {
  const { data, error } = await db.from("profile_test_results").select("test_id");
  logQueryError("getProfileTestCompletions", error);

  const counts = new Map<string, number>();
  (data ?? []).forEach((row: Row) => counts.set(row.test_id, (counts.get(row.test_id) ?? 0) + 1));
  return counts;
}

export async function getProfileTests(db: DB, onlyPublished = false): Promise<ProfileTest[]> {
  let query = db.from("profile_tests").select(TEST_SELECT).order("created_at", { ascending: false });
  if (onlyPublished) query = query.eq("status", "published");

  const [{ data, error }, counts] = await Promise.all([query, getCompletionCounts(db)]);
  logQueryError("getProfileTests", error);

  return (data ?? []).map((row: Row) => mapProfileTest(row, counts.get(row.id) ?? 0));
}

export async function getProfileTestById(db: DB, id: string): Promise<ProfileTest | null> {
  const { data, error } = await db.from("profile_tests").select(TEST_SELECT).eq("id", id).maybeSingle();
  logQueryError("getProfileTestById", error);
  return data ? mapProfileTest(data) : null;
}

export async function getProfileTestBySlug(db: DB, slug: string): Promise<ProfileTest | null> {
  const { data, error } = await db.from("profile_tests").select(TEST_SELECT).eq("slug", slug).maybeSingle();
  logQueryError("getProfileTestBySlug", error);
  return data ? mapProfileTest(data) : null;
}

function mapResult(row: Row): ProfileTestResult {
  return {
    testId: row.test_id,
    testTitle: row.test_title,
    categoryId: row.category_id,
    categoryName: row.category_name,
    scores: (row.scores ?? []) as ProfileTestScore[],
    completedAt: row.completed_at,
  };
}

export async function getMyProfileTestResults(db: DB, userId: string): Promise<ProfileTestResult[]> {
  const { data, error } = await db
    .from("profile_test_results")
    .select("test_id, test_title, category_id, category_name, scores, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  logQueryError("getMyProfileTestResults", error);
  return (data ?? []).map(mapResult);
}

export function getProfileTestResult(
  testId: string,
  results: ProfileTestResult[],
): ProfileTestResult | null {
  return results.find((item) => item.testId === testId) ?? null;
}

/** Monta o registro a partir do que o runner já calculou. */
export function buildProfileTestResult(
  test: Pick<ProfileTest, "id" | "title">,
  winner: ProfileCategory,
  scores: Array<{ category: ProfileCategory; percentage: number }>,
  now = new Date(),
): ProfileTestResult {
  return {
    testId: test.id,
    testTitle: test.title,
    categoryId: winner.id,
    categoryName: winner.name,
    scores: scores.map(({ category, percentage }) => ({
      categoryId: category.id,
      categoryName: category.name,
      percentage,
    })),
    completedAt: now.toISOString(),
  };
}
