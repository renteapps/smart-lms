import type { DB, Row } from "./types";

/** Matrícula concedida por uma organização B2B (`gateway_subscription_id` = id da org). */
export const ORGANIZATION_ENROLLMENT_GATEWAY = "organization";

/**
 * Espelho de `public.plan_allows_course(features, course_id)`: plano sem
 * `features` ou com acesso "all" libera tudo; "specific" libera só os ids de
 * `specificCourses`. Mantenha os dois em sincronia.
 */
export function planAllowsCourse(features: unknown, courseId: string): boolean {
  if (!features || typeof features !== "object" || Array.isArray(features)) return true;
  const f = features as { courseAccessType?: unknown; specificCourses?: unknown };
  const specific = Array.isArray(f.specificCourses) ? f.specificCourses : null;
  const accessType =
    typeof f.courseAccessType === "string"
      ? f.courseAccessType
      : specific && specific.length > 0
        ? "specific"
        : "all";
  if (accessType === "all") return true;
  return Boolean(specific?.some((id) => id === courseId));
}

/** Espelho de `public.subscription_grants_access(status, current_period_end)`. */
export function subscriptionGrantsAccess(status: string | null, accessEnd: string | null, now = new Date()): boolean {
  const end = accessEnd ? new Date(accessEnd) : null;
  if (status === "active" || status === "trialing") return end === null || end > now;
  if (status === "past_due" || status === "suspended" || status === "canceled") return end !== null && end > now;
  return false;
}

/**
 * Dos `courseIds` pedidos, quais o contrato da organização cobre: precisa haver
 * assinatura da org dando acesso agora, com plano ativo que libere o curso.
 * Sem isso, um gestor matricularia a empresa inteira em qualquer curso pago.
 */
export async function orgAllowedCourseIds(adminDb: DB, organizationId: string, courseIds: string[]): Promise<Set<string>> {
  const { data, error } = await adminDb
    .from("subscriptions")
    .select("status, current_period_end, plans(features, is_active)")
    .eq("organization_id", organizationId);
  if (error) throw new Error("Não foi possível conferir o contrato da empresa.");

  const plans = (data ?? [])
    .filter((row: Row) => subscriptionGrantsAccess(row.status, row.current_period_end))
    .map((row: Row) => (Array.isArray(row.plans) ? row.plans[0] : row.plans))
    .filter((plan: Row | null | undefined) => plan && plan.is_active !== false);

  return new Set(courseIds.filter((courseId) => plans.some((plan: Row) => planAllowsCourse(plan.features, courseId))));
}

/**
 * Concede os cursos a um colaborador sem sobrescrever matrícula que ele já
 * tenha por conta própria (compra, admin): essas ficam intactas e, por isso,
 * nunca são revogadas quando a empresa tira o curso.
 */
export async function grantOrgEnrollments(
  adminDb: DB,
  organizationId: string,
  userId: string,
  courseIds: string[],
): Promise<void> {
  if (courseIds.length === 0) return;

  const { data: existing, error: existingError } = await adminDb
    .from("enrollments")
    .select("course_id, status, gateway")
    .eq("user_id", userId)
    .in("course_id", courseIds);
  if (existingError) throw new Error("Não foi possível conferir as matrículas atuais.");

  const ownedElsewhere = new Set(
    (existing ?? [])
      .filter((row: Row) => row.status === "active" && row.gateway !== ORGANIZATION_ENROLLMENT_GATEWAY)
      .map((row: Row) => row.course_id as string),
  );

  const rows = courseIds
    .filter((courseId) => !ownedElsewhere.has(courseId))
    .map((courseId) => ({
      user_id: userId,
      course_id: courseId,
      status: "active",
      gateway: ORGANIZATION_ENROLLMENT_GATEWAY,
      gateway_subscription_id: organizationId,
      gateway_updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return;

  const { error } = await adminDb.from("enrollments").upsert(rows, { onConflict: "user_id,course_id" });
  if (error) throw new Error("Não foi possível matricular o colaborador.");
}

/** Revoga só matrículas que ESTA organização concedeu. Sem `courseIds`, revoga todas. */
export async function revokeOrgEnrollments(
  adminDb: DB,
  organizationId: string,
  userId: string,
  courseIds?: string[],
): Promise<void> {
  if (courseIds && courseIds.length === 0) return;

  let query = adminDb
    .from("enrollments")
    .update({ status: "inactive", gateway_updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("gateway", ORGANIZATION_ENROLLMENT_GATEWAY)
    .eq("gateway_subscription_id", organizationId);
  if (courseIds) query = query.in("course_id", courseIds);

  const { error } = await query;
  if (error) throw new Error("Não foi possível revogar as matrículas da empresa.");
}
