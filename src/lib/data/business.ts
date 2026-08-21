import type {
  Company,
  CompanyAnalytics,
  CompanyCourseStat,
  CompanyInvite,
  CompanyMember,
  CompanyPlanType,
  CompanyStatus,
  DepartmentStat,
  MemberRole,
  MemberStatus,
} from "@/types/business";
import { logQueryError, type DB, type Row } from "./types";
import { getProgressByCourseForUsers } from "./courses";

/**
 * B2B corporativo sobre `organizations` / `organization_members`.
 *
 * Os papéis do produto ("gestor", "líder de equipe", "colaborador") são um
 * vocabulário mais estreito que o enum `org_role` do banco: a tradução mora
 * aqui, nos dois sentidos, para que a UI não precise conhecer o enum.
 */

const ROLE_TO_DB: Record<MemberRole, string> = {
  gestor: "admin",
  lider_equipe: "manager",
  colaborador: "employee",
};

const ROLE_FROM_DB: Record<string, MemberRole> = {
  owner: "gestor",
  admin: "gestor",
  manager: "lider_equipe",
  employee: "colaborador",
};

const MEMBER_STATUS_FROM_DB: Record<string, MemberStatus> = {
  active: "ativo",
  invited: "convidado",
  disabled: "desativado",
};

export function toDbRole(role: MemberRole): string {
  return ROLE_TO_DB[role] ?? "employee";
}

export function fromDbRole(role: string): MemberRole {
  return ROLE_FROM_DB[role] ?? "colaborador";
}

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

const COMPANY_SELECT = `
  id, name, trade_name, slug, document, logo_url, allowed_domains,
  auto_domain_approval, manager_name, manager_email, manager_phone, max_seats,
  plan_type, status, is_active, contract_start, contract_end, contract_value,
  departments, settings, created_at, updated_at
`;

function mapCompany(row: Row, seatsUsed: number, allowedCourseIds: string[]): Company {
  return {
    id: row.id,
    name: row.name,
    tradeName: row.trade_name || row.name,
    cnpj: row.document ?? "",
    domain: (row.allowed_domains ?? [])[0] ?? undefined,
    autoDomainApproval: row.auto_domain_approval ?? false,
    logoUrl: row.logo_url ?? undefined,
    managerName: row.manager_name ?? "",
    managerEmail: row.manager_email ?? "",
    managerPhone: row.manager_phone ?? undefined,
    seatsTotal: row.max_seats ?? 0,
    seatsUsed,
    planType: (row.plan_type ?? "mensal") as CompanyPlanType,
    status: (row.status ?? "ativo") as CompanyStatus,
    contractStart: row.contract_start ?? "",
    contractEnd: row.contract_end ?? "",
    contractValue: row.contract_value != null ? Number(row.contract_value) : 0,
    allowedCourseIds,
    departments: row.departments ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCompanies(db: DB): Promise<Company[]> {
  const [{ data, error }, seats, tracks] = await Promise.all([
    db.from("organizations").select(COMPANY_SELECT).order("name", { ascending: true }),
    getSeatUsage(db),
    getOrganizationTracks(db),
  ]);

  logQueryError("getCompanies", error);
  return (data ?? []).map((row: Row) =>
    mapCompany(row, seats.get(row.id) ?? 0, tracks.get(row.id) ?? []),
  );
}

export async function getCompanyById(db: DB, id: string): Promise<Company | null> {
  const { data, error } = await db.from("organizations").select(COMPANY_SELECT).eq("id", id).maybeSingle();
  logQueryError("getCompanyById", error);
  if (!data) return null;

  const [seats, tracks] = await Promise.all([getSeatUsage(db, id), getOrganizationTracks(db, id)]);
  return mapCompany(data, seats.get(id) ?? 0, tracks.get(id) ?? []);
}

/** Assentos ocupados = membros ativos ou convidados (o convite já reserva). */
async function getSeatUsage(db: DB, organizationId?: string): Promise<Map<string, number>> {
  let query = db.from("organization_members").select("organization_id, status");
  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data, error } = await query;
  logQueryError("getSeatUsage", error);

  const usage = new Map<string, number>();
  (data ?? []).forEach((row: Row) => {
    if (row.status === "disabled") return;
    usage.set(row.organization_id, (usage.get(row.organization_id) ?? 0) + 1);
  });
  return usage;
}

async function getOrganizationTracks(db: DB, organizationId?: string): Promise<Map<string, string[]>> {
  let query = db.from("organization_tracks").select("organization_id, course_id");
  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data, error } = await query;
  logQueryError("getOrganizationTracks", error);

  const tracks = new Map<string, string[]>();
  (data ?? []).forEach((row: Row) => {
    tracks.set(row.organization_id, [...(tracks.get(row.organization_id) ?? []), row.course_id]);
  });
  return tracks;
}

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------

const MEMBER_SELECT = `
  id, organization_id, user_id, role, department, job_title, status, invited_at,
  joined_at, last_access_at, notes,
  profiles:user_id ( full_name, email, avatar_url ),
  organization_member_courses ( course_id )
`;

export async function getCompanyMembers(db: DB, companyId: string): Promise<CompanyMember[]> {
  const { data, error } = await db
    .from("organization_members")
    .select(MEMBER_SELECT)
    .eq("organization_id", companyId)
    .order("joined_at", { ascending: true });

  logQueryError("getCompanyMembers", error);
  if (!data?.length) return [];

  // Progresso real de cada membro, calculado a partir do que ele concluiu.
  const memberUserIds = data.map((row: Row) => row.user_id).filter(Boolean);
  const progressByUserCourse = await getProgressByCourseForUsers(db, memberUserIds);
  const progressByUser = new Map<string, { average: number; completed: number }>();
  data.forEach((row: Row) => {
    if (!row.user_id) return;
    const byCourse = progressByUserCourse.get(row.user_id) ?? new Map<string, number>();
    const assigned = (row.organization_member_courses ?? []).map((item: Row) => item.course_id);
    const relevant = assigned.length
      ? assigned.map((courseId: string) => byCourse.get(courseId) ?? 0)
      : [...byCourse.values()];
    const average = relevant.length
      ? Math.round(relevant.reduce((sum: number, value: number) => sum + value, 0) / relevant.length)
      : 0;
    progressByUser.set(row.user_id, {
      average,
      completed: relevant.filter((value: number) => value >= 100).length,
    });
  });

  const certificates = await getCertificateCounts(db);

  return data.map((row: Row) => {
    const progress = progressByUser.get(row.user_id) ?? { average: 0, completed: 0 };
    return {
      id: row.id,
      companyId: row.organization_id,
      name: row.profiles?.full_name ?? row.profiles?.email ?? "Sem nome",
      email: row.profiles?.email ?? "",
      roleInCompany: fromDbRole(row.role),
      department: row.department ?? "",
      jobTitle: row.job_title ?? undefined,
      status: MEMBER_STATUS_FROM_DB[row.status] ?? "ativo",
      invitedAt: row.invited_at,
      joinedAt: row.joined_at ?? undefined,
      lastAccessAt: row.last_access_at ?? undefined,
      progressPercentage: progress.average,
      completedCoursesCount: progress.completed,
      assignedCourseIds: (row.organization_member_courses ?? []).map((item: Row) => item.course_id),
      certificatesCount: certificates.get(row.user_id) ?? 0,
      notes: row.notes ?? undefined,
    } satisfies CompanyMember;
  });
}

async function getCertificateCounts(db: DB): Promise<Map<string, number>> {
  const { data, error } = await db.from("certificates").select("user_id");
  logQueryError("getCertificateCounts", error);

  const counts = new Map<string, number>();
  (data ?? []).forEach((row: Row) => counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1));
  return counts;
}

export async function getCompanyInvites(db: DB, companyId: string): Promise<CompanyInvite[]> {
  const { data, error } = await db
    .from("organization_invites")
    .select("id, organization_id, email, full_name, role, department, token, status, created_by, created_at, expires_at")
    .eq("organization_id", companyId)
    .order("created_at", { ascending: false });

  logQueryError("getCompanyInvites", error);

  const statusMap: Record<string, CompanyInvite["status"]> = {
    pending: "pendente",
    accepted: "aceito",
    revoked: "cancelado",
    expired: "expirado",
  };

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    companyId: row.organization_id,
    email: row.email,
    name: row.full_name ?? undefined,
    department: row.department ?? undefined,
    roleInCompany: fromDbRole(row.role),
    invitedBy: row.created_by ?? "",
    token: row.token,
    status: statusMap[row.status] ?? "pendente",
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export async function getAvailableSeats(db: DB, companyId: string): Promise<number> {
  const company = await getCompanyById(db, companyId);
  if (!company) return 0;
  return Math.max(0, company.seatsTotal - company.seatsUsed);
}

// ---------------------------------------------------------------------------
// Painel corporativo
// ---------------------------------------------------------------------------

export async function getCompanyAnalytics(db: DB, companyId: string): Promise<CompanyAnalytics> {
  const [company, members] = await Promise.all([
    getCompanyById(db, companyId),
    getCompanyMembers(db, companyId),
  ]);

  const seatsTotal = company?.seatsTotal ?? 0;
  const seatsUsed = members.filter((member) => member.status !== "desativado").length;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const activeThisWeek = members.filter(
    (member) => member.lastAccessAt && new Date(member.lastAccessAt).getTime() >= weekAgo,
  ).length;

  const averageProgress = members.length
    ? Math.round(members.reduce((sum, member) => sum + member.progressPercentage, 0) / members.length)
    : 0;

  const totalHoursWatched = await getWatchedHours(db, companyId);

  // Departamentos
  const byDepartment = new Map<string, CompanyMember[]>();
  members.forEach((member) => {
    const key = member.department || "Sem departamento";
    byDepartment.set(key, [...(byDepartment.get(key) ?? []), member]);
  });

  const departmentStats: DepartmentStat[] = [...byDepartment.entries()].map(([department, list]) => ({
    department,
    memberCount: list.length,
    completionRate: list.length
      ? Math.round(list.reduce((sum, member) => sum + member.progressPercentage, 0) / list.length)
      : 0,
    activeCount: list.filter((member) => member.status === "ativo").length,
  }));

  const courseStats = await getCompanyCourseStats(db, companyId, members);

  return {
    seatsTotal,
    seatsUsed,
    seatsAvailable: Math.max(0, seatsTotal - seatsUsed),
    activeThisWeek,
    averageProgress,
    totalHoursWatched,
    certificatesIssued: members.reduce((sum, member) => sum + member.certificatesCount, 0),
    departmentStats,
    courseStats,
  };
}

async function getWatchedHours(db: DB, companyId: string): Promise<number> {
  const { data: memberRows } = await db
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", companyId);

  const userIds = (memberRows ?? []).map((row: Row) => row.user_id).filter(Boolean);
  if (!userIds.length) return 0;

  const { data, error } = await db
    .from("v_user_watch_time")
    .select("completed_minutes")
    .in("user_id", userIds);

  logQueryError("getWatchedHours", error);

  const minutes = (data ?? []).reduce((sum: number, row: Row) => sum + (row.completed_minutes ?? 0), 0);
  return Math.round(minutes / 60);
}

async function getCompanyCourseStats(
  db: DB,
  companyId: string,
  members: CompanyMember[],
): Promise<CompanyCourseStat[]> {
  const { data: tracks, error } = await db
    .from("organization_tracks")
    .select("course_id, courses ( id, title, category )")
    .eq("organization_id", companyId);

  logQueryError("getCompanyCourseStats", error);
  if (!tracks?.length) return [];

  const { data: memberRows } = await db
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", companyId);
  const userIds = (memberRows ?? []).map((row: Row) => row.user_id).filter(Boolean);

  const progressPerUser = await getProgressByCourseForUsers(db, userIds);

  return tracks.map((track: Row) => {
    const course = track.courses;
    const values = userIds.map((userId: string) => progressPerUser.get(userId)?.get(track.course_id) ?? 0);
    const enrolled = members.filter((member) => member.assignedCourseIds.includes(track.course_id)).length;

    return {
      courseId: track.course_id,
      courseTitle: course?.title ?? "Curso",
      category: course?.category ?? "Geral",
      enrolledCount: enrolled || userIds.length,
      completedCount: values.filter((value: number) => value >= 100).length,
      avgProgress: values.length
        ? Math.round(values.reduce((sum: number, value: number) => sum + value, 0) / values.length)
        : 0,
    } satisfies CompanyCourseStat;
  });
}

// ---------------------------------------------------------------------------
// Papel do usuário atual
// ---------------------------------------------------------------------------

export type CompanyManagerStatus = {
  isManager: boolean;
  companyId?: string;
  companyName?: string;
  role?: MemberRole;
};

/** Onde (e como) a pessoa da sessão gerencia uma empresa. */
export async function getCompanyManagerStatus(db: DB, userId: string): Promise<CompanyManagerStatus> {
  const { data, error } = await db
    .from("organization_members")
    .select("role, organization_id, organizations ( name, trade_name )")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "manager"])
    .limit(1)
    .maybeSingle();

  logQueryError("getCompanyManagerStatus", error);
  if (!data) return { isManager: false };

  const org = Array.isArray(data.organizations)
    ? (data.organizations[0] as { name: string; trade_name: string } | undefined)
    : (data.organizations as { name: string; trade_name: string } | null | undefined);

  return {
    isManager: true,
    companyId: data.organization_id,
    companyName: org?.trade_name || org?.name,
    role: fromDbRole(data.role),
  };
}
