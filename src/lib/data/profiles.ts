import { logQueryError, type DB, type Row } from "./types";

export type UserRole = "student" | "instructor" | "admin";

export type UserProfile = {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  headline?: string;
  bio?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  careerRole?: string;
  company?: string;
  state?: string;
  city?: string;
  country?: string;
  location?: string;
  status: string;
  aiCredits: number;
  preferences: Record<string, unknown>;
  lastAccessAt?: string;
  onboardingCompletedAt?: string;
  createdAt: string;
};

const PROFILE_SELECT = `
  id, full_name, username, email, avatar_url, role, headline, bio, phone,
  birth_date, gender, career_role, location, status, ai_credits, preferences,
  last_access_at, onboarding_completed_at, created_at, company, state, city, country
`;

export function mapProfile(row: Row): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name ?? "",
    username: row.username ?? undefined,
    email: row.email ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    role: (row.role ?? "student") as UserRole,
    headline: row.headline ?? undefined,
    bio: row.bio ?? undefined,
    phone: row.phone ?? undefined,
    birthDate: row.birth_date ?? undefined,
    gender: row.gender ?? undefined,
    careerRole: row.career_role ?? undefined,
    company: row.company ?? undefined,
    state: row.state ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    location: row.location ?? undefined,
    status: row.status ?? "active",
    aiCredits: row.ai_credits ?? 0,
    preferences: (row.preferences ?? {}) as Record<string, unknown>,
    lastAccessAt: row.last_access_at ?? undefined,
    onboardingCompletedAt: row.onboarding_completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getProfile(db: DB, userId: string): Promise<UserProfile | null> {
  const { data, error } = await db.from("profiles").select(PROFILE_SELECT).eq("id", userId).maybeSingle();
  logQueryError("getProfile", error);
  return data ? mapProfile(data) : null;
}

export async function getProfiles(db: DB): Promise<UserProfile[]> {
  const { data, error } = await db
    .from("profiles")
    .select(PROFILE_SELECT)
    .order("created_at", { ascending: false });

  logQueryError("getProfiles", error);
  return (data ?? []).map(mapProfile);
}

export type StudentSummary = UserProfile & {
  enrollments: number;
  completedLessons: number;
  certificates: number;
  averageProgress: number;
};

/** Lista de alunos do admin, já com os números que a tabela mostra. */
export async function getStudentsWithStats(db: DB): Promise<StudentSummary[]> {
  const nowIso = new Date().toISOString();
  const [profiles, enrollments, progress, certificates] = await Promise.all([
    getProfiles(db),
    db.from("enrollments").select("user_id, course_id").eq("status", "active").or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    db.from("lesson_progress").select("user_id").eq("is_completed", true),
    db.from("certificates").select("user_id"),
  ]);

  const count = (rows: Row[] | null | undefined) => {
    const map = new Map<string, number>();
    (rows ?? []).forEach((row) => map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1));
    return map;
  };

  const enrollmentCounts = count(enrollments.data);
  const progressCounts = count(progress.data);
  const certificateCounts = count(certificates.data);

  return Promise.all(
    profiles.map(async (profile) => {
      const { getProgressByCourse } = await import("./courses");
      const byCourse = await getProgressByCourse(db, profile.id);
      const values = [...byCourse.values()];
      return {
        ...profile,
        enrollments: enrollmentCounts.get(profile.id) ?? 0,
        completedLessons: progressCounts.get(profile.id) ?? 0,
        certificates: certificateCounts.get(profile.id) ?? 0,
        averageProgress: values.length
          ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
          : 0,
      };
    }),
  );
}

export async function isAdmin(db: DB, userId: string): Promise<boolean> {
  const { data } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}
