import { logQueryError, type DB, type Row } from "./types";

export type AdminUserSortField = "last_access_at" | "created_at" | "full_name";
export type AdminUserSortDir = "asc" | "desc";
export type AdminUserRoleFilter = "all" | "student" | "instructor" | "admin";
export type AdminUserStatusFilter = "all" | "active" | "inactive";
export type AdminUserAccessFilter = "all" | "today" | "7d" | "30d" | "over_30d" | "never";

export type AdminUserFilterParams = {
  q: string;
  sort: AdminUserSortField;
  dir: AdminUserSortDir;
  role: AdminUserRoleFilter;
  status: AdminUserStatusFilter;
  plan: string;
  course: string;
  access: AdminUserAccessFilter;
  page: number;
  pageSize: number;
};

export type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: "student" | "instructor" | "admin";
  status: "active" | "inactive";
  lastAccessAt?: string;
  createdAt: string;
  activePlanId?: string;
  activePlanName?: string;
  activeEnrollmentsCount: number;
  enrolledCourseIds: string[];
};

export type AdminUsersMetrics = {
  totalUsers: number;
  activeStudents: number;
  usersWithActivePlan: number;
  recentActiveUsers: number;
};

export type AdminUsersFilterOptions = {
  plans: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; title: string }>;
};

export type AdminUsersResult = {
  users: AdminUserRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 20;

export function normalizeAdminUserFilters(
  raw: Record<string, string | string[] | undefined> = {},
): AdminUserFilterParams {
  const getSingle = (val: string | string[] | undefined) => (Array.isArray(val) ? val[0] : val);

  const q = (getSingle(raw.q) ?? "").trim();
  const rawSort = getSingle(raw.sort);
  const sort: AdminUserSortField =
    rawSort === "last_access_at" || rawSort === "full_name" ? rawSort : "created_at";

  const rawDir = getSingle(raw.dir);
  const dir: AdminUserSortDir = rawDir === "asc" ? "asc" : "desc";

  const rawRole = getSingle(raw.role);
  const role: AdminUserRoleFilter =
    rawRole === "student" || rawRole === "instructor" || rawRole === "admin" ? rawRole : "all";

  const rawStatus = getSingle(raw.status);
  const status: AdminUserStatusFilter =
    rawStatus === "active" || rawStatus === "inactive" ? rawStatus : "all";

  const plan = (getSingle(raw.plan) ?? "all").trim();
  const course = (getSingle(raw.course) ?? "all").trim();

  const rawAccess = getSingle(raw.access);
  const access: AdminUserAccessFilter =
    rawAccess === "today" ||
    rawAccess === "7d" ||
    rawAccess === "30d" ||
    rawAccess === "over_30d" ||
    rawAccess === "never"
      ? rawAccess
      : "all";

  const parsedPage = parseInt(getSingle(raw.page) ?? "1", 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedPageSize = parseInt(getSingle(raw.pageSize) ?? `${DEFAULT_PAGE_SIZE}`, 10);
  const pageSize =
    Number.isInteger(parsedPageSize) && parsedPageSize > 0 && parsedPageSize <= 100
      ? parsedPageSize
      : DEFAULT_PAGE_SIZE;

  return {
    q,
    sort,
    dir,
    role,
    status,
    plan,
    course,
    access,
    page,
    pageSize,
  };
}

export function mapAdminUserRow(row: Row): AdminUserRow {
  return {
    id: row.id,
    fullName: row.full_name || "Desconhecido",
    email: row.email || "",
    avatarUrl: row.avatar_url || undefined,
    role: (row.role || "student") as AdminUserRow["role"],
    status: (row.status || "active") as AdminUserRow["status"],
    lastAccessAt: row.last_access_at || undefined,
    createdAt: row.created_at,
    activePlanId: row.active_plan_id || undefined,
    activePlanName: row.active_plan_name || undefined,
    activeEnrollmentsCount: Number(row.active_enrollments_count || 0),
    enrolledCourseIds: Array.isArray(row.enrolled_course_ids) ? row.enrolled_course_ids : [],
  };
}

export async function getAdminUsers(
  db: DB,
  filters: AdminUserFilterParams,
): Promise<AdminUsersResult> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  let query = db
    .from("v_admin_users")
    .select(
      `
      id,
      full_name,
      email,
      avatar_url,
      role,
      status,
      last_access_at,
      created_at,
      active_plan_id,
      active_plan_name,
      active_enrollments_count,
      enrolled_course_ids
    `,
      { count: "exact" },
    );

  // Busca textual
  if (filters.q) {
    query = query.or(`full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`);
  }

  // Filtro de Papel
  if (filters.role !== "all") {
    query = query.eq("role", filters.role);
  }

  // Filtro de Status
  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  // Filtro de Plano
  if (filters.plan === "with_plan") {
    query = query.not("active_plan_id", "is", null);
  } else if (filters.plan === "no_plan") {
    query = query.is("active_plan_id", null);
  } else if (filters.plan !== "all") {
    query = query.eq("active_plan_id", filters.plan);
  }

  // Filtro de Curso / Produto
  if (filters.course === "with_course") {
    query = query.gt("active_enrollments_count", 0);
  } else if (filters.course === "no_course") {
    query = query.eq("active_enrollments_count", 0);
  } else if (filters.course !== "all") {
    query = query.contains("enrolled_course_ids", [filters.course]);
  }

  // Filtro de Último Acesso
  const now = new Date();
  if (filters.access === "never") {
    query = query.is("last_access_at", null);
  } else if (filters.access === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    query = query.gte("last_access_at", startOfToday);
  } else if (filters.access === "7d") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("last_access_at", sevenDaysAgo);
  } else if (filters.access === "30d") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("last_access_at", thirtyDaysAgo);
  } else if (filters.access === "over_30d") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.lt("last_access_at", thirtyDaysAgo).not("last_access_at", "is", null);
  }

  // Ordenação
  const ascending = filters.dir === "asc";
  if (filters.sort === "last_access_at") {
    query = query.order("last_access_at", { ascending, nullsFirst: false });
  } else if (filters.sort === "full_name") {
    query = query.order("full_name", { ascending });
  } else {
    query = query.order("created_at", { ascending });
  }

  // Paginação
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    logQueryError("getAdminUsers", error);
    // Fallback caso a view falhe (ex.: ambiente sem a migration)
    return fallbackGetAdminUsers(db, filters);
  }

  const totalCount = count ?? (data?.length || 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));

  return {
    users: (data ?? []).map(mapAdminUserRow),
    totalCount,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

/** Fallback resiliente usando as tabelas profiles, subscriptions e enrollments diretamente. */
async function fallbackGetAdminUsers(
  db: DB,
  filters: AdminUserFilterParams,
): Promise<AdminUsersResult> {
  let profileQuery = db
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, status, last_access_at, created_at");

  if (filters.q) {
    profileQuery = profileQuery.or(`full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`);
  }
  if (filters.role !== "all") {
    profileQuery = profileQuery.eq("role", filters.role);
  }
  if (filters.status !== "all") {
    profileQuery = profileQuery.eq("status", filters.status);
  }

  const { data: rawProfiles, error: profileErr } = await profileQuery;
  logQueryError("fallbackGetAdminUsers:profiles", profileErr);

  if (!rawProfiles) {
    return { users: [], totalCount: 0, page: 1, pageSize: filters.pageSize, totalPages: 1 };
  }

  const nowIso = new Date().toISOString();
  const [subsResult, enrollsResult, plansResult] = await Promise.all([
    db
      .from("subscriptions")
      .select("id, user_id, plan_id, status, current_period_end")
      .in("status", ["active", "trialing"])
      .or(`current_period_end.is.null,current_period_end.gt.${nowIso}`),
    db
      .from("enrollments")
      .select("id, user_id, course_id, status, expires_at")
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    db.from("plans").select("id, name"),
  ]);

  const planNameMap = new Map<string, string>();
  (plansResult.data ?? []).forEach((p) => planNameMap.set(p.id, p.name));

  const userSubMap = new Map<string, { planId: string; planName: string }>();
  (subsResult.data ?? []).forEach((s) => {
    if (s.user_id && !userSubMap.has(s.user_id)) {
      userSubMap.set(s.user_id, {
        planId: s.plan_id,
        planName: planNameMap.get(s.plan_id) || "Plano",
      });
    }
  });

  const userEnrollMap = new Map<string, string[]>();
  (enrollsResult.data ?? []).forEach((e) => {
    if (e.user_id) {
      const list = userEnrollMap.get(e.user_id) ?? [];
      list.push(e.course_id);
      userEnrollMap.set(e.user_id, list);
    }
  });

  let enriched: AdminUserRow[] = rawProfiles.map((p) => {
    const sub = userSubMap.get(p.id);
    const courses = userEnrollMap.get(p.id) ?? [];
    return {
      id: p.id,
      fullName: p.full_name || "Desconhecido",
      email: p.email || "",
      avatarUrl: p.avatar_url || undefined,
      role: (p.role || "student") as AdminUserRow["role"],
      status: (p.status || "active") as AdminUserRow["status"],
      lastAccessAt: p.last_access_at || undefined,
      createdAt: p.created_at,
      activePlanId: sub?.planId,
      activePlanName: sub?.planName,
      activeEnrollmentsCount: courses.length,
      enrolledCourseIds: courses,
    };
  });

  // Filtro de Plano no fallback
  if (filters.plan === "with_plan") {
    enriched = enriched.filter((u) => !!u.activePlanId);
  } else if (filters.plan === "no_plan") {
    enriched = enriched.filter((u) => !u.activePlanId);
  } else if (filters.plan !== "all") {
    enriched = enriched.filter((u) => u.activePlanId === filters.plan);
  }

  // Filtro de Curso no fallback
  if (filters.course === "with_course") {
    enriched = enriched.filter((u) => u.activeEnrollmentsCount > 0);
  } else if (filters.course === "no_course") {
    enriched = enriched.filter((u) => u.activeEnrollmentsCount === 0);
  } else if (filters.course !== "all") {
    enriched = enriched.filter((u) => u.enrolledCourseIds.includes(filters.course));
  }

  // Filtro de Último Acesso no fallback
  const nowMs = Date.now();
  if (filters.access === "never") {
    enriched = enriched.filter((u) => !u.lastAccessAt);
  } else if (filters.access === "today") {
    const startOfTodayMs = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    enriched = enriched.filter(
      (u) => u.lastAccessAt && new Date(u.lastAccessAt).getTime() >= startOfTodayMs,
    );
  } else if (filters.access === "7d") {
    const sevenDaysMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    enriched = enriched.filter(
      (u) => u.lastAccessAt && new Date(u.lastAccessAt).getTime() >= sevenDaysMs,
    );
  } else if (filters.access === "30d") {
    const thirtyDaysMs = nowMs - 30 * 24 * 60 * 60 * 1000;
    enriched = enriched.filter(
      (u) => u.lastAccessAt && new Date(u.lastAccessAt).getTime() >= thirtyDaysMs,
    );
  } else if (filters.access === "over_30d") {
    const thirtyDaysMs = nowMs - 30 * 24 * 60 * 60 * 1000;
    enriched = enriched.filter(
      (u) => u.lastAccessAt && new Date(u.lastAccessAt).getTime() < thirtyDaysMs,
    );
  }

  // Ordenação no fallback
  enriched.sort((a, b) => {
    let comparison = 0;
    if (filters.sort === "last_access_at") {
      const aTime = a.lastAccessAt ? new Date(a.lastAccessAt).getTime() : -1;
      const bTime = b.lastAccessAt ? new Date(b.lastAccessAt).getTime() : -1;
      if (aTime === -1 && bTime === -1) comparison = 0;
      else if (aTime === -1) comparison = 1;
      else if (bTime === -1) comparison = -1;
      else comparison = aTime - bTime;
    } else if (filters.sort === "full_name") {
      comparison = a.fullName.localeCompare(b.fullName, "pt-BR");
    } else {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      comparison = aTime - bTime;
    }
    return filters.dir === "asc" ? comparison : -comparison;
  });

  const totalCount = enriched.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const from = (filters.page - 1) * filters.pageSize;
  const paginatedUsers = enriched.slice(from, from + filters.pageSize);

  return {
    users: paginatedUsers,
    totalCount,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

export async function getAdminUsersMetrics(db: DB): Promise<AdminUsersMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalRes, activeStudentsRes, withPlanRes, recentAccessRes] = await Promise.all([
    db.from("v_admin_users").select("id", { count: "exact", head: true }),
    db
      .from("v_admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("status", "active"),
    db.from("v_admin_users").select("id", { count: "exact", head: true }).not("active_plan_id", "is", null),
    db.from("v_admin_users").select("id", { count: "exact", head: true }).gte("last_access_at", sevenDaysAgo),
  ]);

  if (totalRes.error) {
    // Fallback via profiles
    const [pTotal, pStudents, subs] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("status", "active"),
      db.from("subscriptions").select("user_id").in("status", ["active", "trialing"]),
    ]);
    const uniqueSubs = new Set((subs.data ?? []).map((s) => s.user_id)).size;
    return {
      totalUsers: pTotal.count || 0,
      activeStudents: pStudents.count || 0,
      usersWithActivePlan: uniqueSubs,
      recentActiveUsers: 0,
    };
  }

  return {
    totalUsers: totalRes.count || 0,
    activeStudents: activeStudentsRes.count || 0,
    usersWithActivePlan: withPlanRes.count || 0,
    recentActiveUsers: recentAccessRes.count || 0,
  };
}

export async function getAdminUsersFilterOptions(db: DB): Promise<AdminUsersFilterOptions> {
  const [plansRes, coursesRes] = await Promise.all([
    db.from("plans").select("id, name").order("order_index", { ascending: true }).order("name"),
    db.from("courses").select("id, title").order("title", { ascending: true }),
  ]);

  logQueryError("getAdminUsersFilterOptions:plans", plansRes.error);
  logQueryError("getAdminUsersFilterOptions:courses", coursesRes.error);

  return {
    plans: (plansRes.data ?? []).map((p) => ({ id: p.id, name: p.name })),
    courses: (coursesRes.data ?? []).map((c) => ({ id: c.id, title: c.title })),
  };
}
