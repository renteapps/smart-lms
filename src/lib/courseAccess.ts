import type { StudentCourseState } from '@/types/course';

type PlanFeatures =
  | string[]
  | {
      courseAccessType?: 'all' | 'specific';
      specificCourses?: unknown;
    }
  | null
  | undefined;

export function isEnrollmentActive(
  enrollment: { status?: string | null; expiresAt?: string | null },
  now = new Date(),
): boolean {
  if (enrollment.status !== 'active') return false;
  if (!enrollment.expiresAt) return true;
  const expiresAt = new Date(enrollment.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
}

export function isSubscriptionActive(
  subscription: { status?: string | null; currentPeriodEnd?: string | null },
  now = new Date(),
): boolean {
  const openEnded = subscription.status === 'active' || subscription.status === 'trialing';
  const gracePeriod = subscription.status === 'past_due'
    || subscription.status === 'suspended'
    || subscription.status === 'canceled';
  if (!openEnded && !gracePeriod) return false;
  if (!subscription.currentPeriodEnd) return openEnded;
  const periodEnd = new Date(subscription.currentPeriodEnd);
  return !Number.isNaN(periodEnd.getTime()) && periodEnd > now;
}

export function getCourseSalesTemplate(input: {
  salesUrl?: unknown;
  salesConfig?: unknown;
}): string | null {
  if (typeof input.salesUrl === 'string' && input.salesUrl.trim()) return input.salesUrl.trim();
  if (!input.salesConfig || typeof input.salesConfig !== 'object') return null;

  const configuredUrl = (input.salesConfig as { salesUrl?: unknown }).salesUrl;
  return typeof configuredUrl === 'string' && configuredUrl.trim() ? configuredUrl.trim() : null;
}

export function planAllowsCourse(features: PlanFeatures, courseId: string): boolean {
  if (!features || Array.isArray(features)) return true;

  const specificCourses = Array.isArray(features.specificCourses)
    ? features.specificCourses.filter((value): value is string => typeof value === 'string')
    : [];
  const accessType = features.courseAccessType ?? (specificCourses.length > 0 ? 'specific' : 'all');

  return accessType === 'all' || specificCourses.includes(courseId);
}

export function hasCourseAccess(input: {
  courseId: string;
  enrolledCourseIds: ReadonlySet<string>;
  activePlanFeatures: PlanFeatures[];
}): boolean {
  return input.enrolledCourseIds.has(input.courseId)
    || input.activePlanFeatures.some((features) => planAllowsCourse(features, input.courseId));
}

export function deriveStudentCourseState(input: {
  hasAccess: boolean;
  hasStarted: boolean;
  progress: number;
  certificateEnabled: boolean;
  certificateIssued?: boolean;
  salesUrl?: string | null;
}): StudentCourseState {
  if (!input.hasAccess) {
    return { kind: 'locked', salesUrl: input.salesUrl?.trim() || null };
  }

  const progress = Math.min(100, Math.max(0, Math.round(input.progress)));
  if (progress === 100) {
    return {
      kind: 'completed',
      certificateEnabled: input.certificateEnabled,
      certificateIssued: Boolean(input.certificateIssued),
    };
  }

  if (input.hasStarted) return { kind: 'in-progress', progress };
  return { kind: 'available' };
}

export function getStudentCourseAction(input: {
  state: StudentCourseState;
  courseId?: string;
  courseSlug?: string;
  courseHref?: string | null;
  resolvedSalesUrl?: string | null;
}): { label: string; href: string | null } {
  const courseHref = input.courseHref ?? (input.courseId ? `/courses/${input.courseSlug || input.courseId}` : null);

  switch (input.state.kind) {
    case 'locked':
      return input.resolvedSalesUrl
        ? { label: 'Realizar Matrícula', href: input.resolvedSalesUrl }
        : { label: 'Matrícula indisponível', href: null };
    case 'available':
      return { label: 'Conhecer curso', href: courseHref };
    case 'in-progress':
      return { label: 'Continuar curso', href: courseHref };
    case 'completed':
      return input.state.certificateEnabled
        ? {
            label: 'Certificado',
            href: input.courseId
              ? `/certificados?curso=${encodeURIComponent(input.courseId)}`
              : '/certificados',
          }
        : { label: 'Revisar curso', href: courseHref };
  }
}
