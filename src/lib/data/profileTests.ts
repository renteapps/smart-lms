import type { ProfileCategory, ProfileQuestion, ProfileTest } from "@/types/profileTest";
import { hasCourseAccess, isEnrollmentActive, isSubscriptionActive } from "@/lib/courseAccess";
import { evaluateProfileTestAccess } from "@/lib/profileTestAccess";
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
  if (error) console.error("DEBUG getProfileTestById ERROR:", error);
  logQueryError("getProfileTestById", error);
  return data ? mapProfileTest(data) : null;
}

/**
 * Lê o teste pelo link compartilhável.
 *
 * Via RPC, e não pela tabela, porque a RLS esconde a linha de quem não tem
 * acesso — a função devolve o cabeçalho para a página conseguir dizer "acesso
 * restrito" em vez de "não encontrado", e só entrega as perguntas a quem pode
 * responder.
 */
export async function getProfileTestBySlug(db: DB, slug: string): Promise<ProfileTest | null> {
  const { data, error } = await db.rpc("profile_test_by_slug", { p_slug: slug }).maybeSingle();
  logQueryError("getProfileTestBySlug", error);
  return data ? mapProfileTest(data as Row) : null;
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

export type ProfileTestAccessContext = {
  isAdmin: boolean;
  /** Cursos que o usuário realmente pode assistir hoje. */
  courseIds: Set<string>;
  /** Planos com assinatura ativa. */
  planIds: Set<string>;
};

export const EMPTY_ACCESS_CONTEXT: ProfileTestAccessContext = {
  isAdmin: false,
  courseIds: new Set<string>(),
  planIds: new Set<string>(),
};

/**
 * Reúne o que a política de acesso precisa saber sobre o usuário.
 *
 * Usa a mesma regra das vitrines — matrícula ativa ou plano que libera o curso
 * — para o teste nunca trancar quem a plataforma já deixa entrar no conteúdo.
 */
export async function getProfileTestAccessContext(
  db: DB,
  userId: string,
  requiredCourseIds: readonly string[] = [],
  now = new Date(),
): Promise<ProfileTestAccessContext> {
  const [profile, enrollments, subscriptions] = await Promise.all([
    db.from("profiles").select("role").eq("id", userId).maybeSingle(),
    requiredCourseIds.length > 0
      ? db.from("enrollments").select("course_id, status, expires_at").eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
    db
      .from("subscriptions")
      .select("plan_id, status, current_period_end, plans(features, is_active)")
      .eq("user_id", userId),
  ]);

  logQueryError("getProfileTestAccessContext:profile", profile.error);
  logQueryError("getProfileTestAccessContext:enrollments", enrollments.error);
  logQueryError("getProfileTestAccessContext:subscriptions", subscriptions.error);

  const activeSubscriptions = (subscriptions.data ?? []).filter((row: Row) => {
    if (!isSubscriptionActive({ status: row.status, currentPeriodEnd: row.current_period_end }, now)) {
      return false;
    }
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    return plan?.is_active !== false;
  });

  // `subscriptions` é a única fonte de plano do usuário: `profiles` não guarda plano.
  const planIds = new Set<string>(
    activeSubscriptions.map((row: Row) => row.plan_id).filter((id: string | null): id is string => Boolean(id)),
  );

  const enrolledCourseIds = new Set<string>(
    (enrollments.data ?? [])
      .filter((row: Row) => isEnrollmentActive({ status: row.status, expiresAt: row.expires_at }, now))
      .map((row: Row) => row.course_id),
  );

  const activePlanFeatures = activeSubscriptions.map((row: Row) => {
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    return plan?.features;
  });

  const courseIds = new Set<string>();
  for (const courseId of requiredCourseIds) {
    if (hasCourseAccess({ courseId, enrolledCourseIds, activePlanFeatures })) courseIds.add(courseId);
  }

  return {
    isAdmin: profile.data?.role === "admin",
    courseIds,
    planIds,
  };
}

/**
 * Filtra a vitrine de testes pelo que o usuário pode de fato abrir.
 *
 * Sem isso o aluno veria o card de um teste exclusivo de outro curso ou plano
 * e só descobriria a restrição depois de clicar.
 */
export async function getAccessibleProfileTests(
  db: DB,
  userId: string,
  tests: ProfileTest[],
): Promise<ProfileTest[]> {
  if (tests.length === 0) return [];

  const requiredCourseIds = [...new Set(tests.flatMap((test) => test.requiredCourseIds ?? []))];
  const context = await getProfileTestAccessContext(db, userId, requiredCourseIds);

  return tests.filter(
    (test) =>
      evaluateProfileTestAccess({
        test,
        isLoggedIn: true,
        isAdmin: context.isAdmin,
        courseIds: context.courseIds,
        planIds: context.planIds,
      }).allowed,
  );
}
