import type {
  CatalogCourse,
  ContinueLesson,
  Course,
  CourseOutline,
  CourseOutlineModule,
  Lesson,
  LessonContentBlock,
  Module,
} from "@/types/course";
import {
  deriveStudentCourseState,
  getCourseSalesTemplate,
  hasCourseAccess,
  isEnrollmentActive,
  isSubscriptionActive,
} from "@/lib/courseAccess";
import { logQueryError, type DB, type Row } from "./types";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1200&auto=format&fit=crop";

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapLesson(row: Row, progress?: Row | null): Lesson {
  return {
    id: row.id,
    moduleId: row.module_id ?? undefined,
    title: row.title,
    type: (row.type ?? "video") as Lesson["type"],
    videoUrl: row.video_url ?? undefined,
    pandavideoId: row.pandavideo_id ?? undefined,
    content: row.content ?? "",
    blocks: Array.isArray(row.blocks) ? (row.blocks as LessonContentBlock[]) : [],
    attachments: Array.isArray(row.attachments)
      ? row.attachments.map((item: Row) => ({ id: item.id, name: item.name, url: item.url }))
      : [],
    durationInMinutes: row.duration_in_minutes ?? 0,
    order: row.order_index ?? 0,
    isPublished: row.is_published ?? true,
    isCompleted: progress?.is_completed ?? false,
    userRating: progress?.user_rating ?? undefined,
    lastWatchedSecond: progress?.last_watched_second ?? 0,
    slug: row.slug ?? undefined,
    transcription: row.transcription ?? undefined,
    shortDescription: row.short_description ?? undefined,
    quizId: row.quiz_id ?? undefined,
    profileTestId: row.profile_test_ref ?? row.profile_test_id ?? undefined,
    profileTestConfig: row.profile_test_config ?? undefined,
    topics: row.topics ?? [],
    solves: row.solves ?? [],
    level: row.level ?? "iniciante",
    objective: row.objective ?? undefined,
    audience: row.audience ?? undefined,
    prerequisites: row.prerequisites ?? [],
    isEligibleForTrail: row.is_eligible_for_trail ?? true,
  };
}

export function mapCourse(row: Row, modules: Module[] = []): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    shortDescription: row.short_description ?? undefined,
    category: row.category ?? "Geral",
    coverUrl: row.cover_url ?? FALLBACK_COVER,
    duration: row.duration ?? undefined,
    level: row.level ?? "Essencial",
    price: row.price != null ? Number(row.price) : 0,
    tags: row.tags ?? [],
    isPublished: row.is_published ?? true,
    status: row.status ?? (row.is_published ? "Publicado" : "Rascunho"),
    isFeatured: row.is_featured ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modules,
    enableCertificates: row.enable_certificates ?? true,
    dripContent: row.drip_content ?? false,
    enableComments: row.enable_comments ?? true,
    requireSequentialProgress: row.require_sequential_progress ?? true,
    accessExpirationDays: row.access_expiration_days ?? null,
    maxStudents: row.max_students ?? null,
    salesUrl: row.sales_url ?? null,
    salesPageUrl: row.sales_page_url ?? null,
    salesConfig: row.sales_config ?? null,
  };
}

/** "3h 20min" a partir dos minutos somados das aulas. */
export function formatDuration(totalMinutes: number): string {
  if (!totalMinutes) return "—";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/**
 * Vitrine de cursos. Duração e número de aulas saem do próprio conteúdo — não
 * de um campo que alguém precisa lembrar de atualizar.
 *
 * @param userId quando presente, cada cartão volta com acesso, início, progresso e conclusão.
 */
export async function getCatalogCourses(db: DB, userId?: string | null): Promise<CatalogCourse[]> {
  const { data, error } = await db
    .from("courses")
    .select(
      "id, slug, title, category, description, short_description, cover_url, duration, level, order_index, created_at, status, is_published, sales_url, sales_config, enable_certificates, modules(id, lessons(id, duration_in_minutes, is_published))",
    )
    .eq("is_published", true)
    .neq("status", "Arquivado")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  logQueryError("getCatalogCourses", error);
  if (!data) return [];

  const lessonIdsByCourse = new Map<string, string[]>();
  const courses = data
    .map((row: Row) => {
      const lessons = (row.modules ?? []).flatMap((mod: Row) =>
        (mod.lessons ?? []).filter((lesson: Row) => lesson.is_published !== false),
      );
      const totalMinutes = lessons.reduce(
        (sum: number, lesson: Row) => sum + (lesson.duration_in_minutes ?? 0),
        0,
      );
      lessonIdsByCourse.set(row.id, lessons.map((lesson: Row) => lesson.id));

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category ?? "Geral",
        description: row.short_description || row.description || "",
        cover: row.cover_url || FALLBACK_COVER,
        duration: row.duration || formatDuration(totalMinutes),
        lessonCount: lessons.length,
        level: row.level ?? "Essencial",
        certificateEnabled: row.enable_certificates ?? true,
        studentState: deriveStudentCourseState({
          hasAccess: false,
          hasStarted: false,
          progress: 0,
          certificateEnabled: row.enable_certificates ?? true,
          salesUrl: getCourseSalesTemplate({
            salesUrl: row.sales_url,
            salesConfig: row.sales_config,
          }),
        }),
      } satisfies CatalogCourse;
    })
    .filter((course) => course.lessonCount > 0);

  if (!userId || courses.length === 0) return courses;

  const now = new Date();
  const allLessonIds = Array.from(lessonIdsByCourse.values()).flat();
  const [progressResult, enrollmentsResult, subscriptionsResult, certificatesResult] = await Promise.all([
    db
      .from("lesson_progress")
      .select("lesson_id, is_completed, last_watched_second")
      .eq("user_id", userId)
      .in("lesson_id", allLessonIds),
    db
      .from("enrollments")
      .select("course_id, status, expires_at")
      .eq("user_id", userId),
    db
      .from("subscriptions")
      .select("status, current_period_end, plans!inner(features, is_active)")
      .eq("user_id", userId),
    db.from("certificates").select("course_id").eq("user_id", userId),
  ]);

  logQueryError("getCatalogCourses:progress", progressResult.error);
  logQueryError("getCatalogCourses:enrollments", enrollmentsResult.error);
  logQueryError("getCatalogCourses:subscriptions", subscriptionsResult.error);
  logQueryError("getCatalogCourses:certificates", certificatesResult.error);

  const enrollmentCourseIds = new Set(
    (enrollmentsResult.data ?? [])
      .filter((row: Row) => isEnrollmentActive({
        status: row.status,
        expiresAt: row.expires_at,
      }, now))
      .map((row: Row) => row.course_id),
  );
  const issuedCertificateCourseIds = new Set(
    (certificatesResult.data ?? []).map((row: Row) => row.course_id),
  );
  const progressByLesson = new Map(
    (progressResult.data ?? []).map((row: Row) => [row.lesson_id, row]),
  );
  const activePlanFeatures = (subscriptionsResult.data ?? [])
    .filter((row: Row) => {
      if (!isSubscriptionActive({
        status: row.status,
        currentPeriodEnd: row.current_period_end,
      }, now)) return false;
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return plan?.is_active !== false;
    })
    .map((row: Row) => {
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return plan?.features;
    });

  return courses.map((course) => ({
    ...course,
    ...deriveCatalogCourseStudentData({
      course,
      lessonIds: lessonIdsByCourse.get(course.id) ?? [],
      progressByLesson,
      hasAccess: hasCourseAccess({
        courseId: course.id,
        enrolledCourseIds: enrollmentCourseIds,
        activePlanFeatures,
      }),
      certificateIssued: issuedCertificateCourseIds.has(course.id),
    }),
  }));
}

function deriveCatalogCourseStudentData(input: {
  course: CatalogCourse;
  lessonIds: string[];
  progressByLesson: Map<string, Row>;
  hasAccess: boolean;
  certificateIssued: boolean;
}): Pick<CatalogCourse, "progress" | "studentState"> {
  const progressRows = input.lessonIds
    .map((lessonId) => input.progressByLesson.get(lessonId))
    .filter(Boolean) as Row[];
  const completedLessons = progressRows.filter((row) => row.is_completed === true).length;
  const progress = input.lessonIds.length
    ? Math.round((completedLessons / input.lessonIds.length) * 100)
    : 0;
  const lockedState = input.course.studentState?.kind === "locked"
    ? input.course.studentState
    : { kind: "locked" as const, salesUrl: null };

  return {
    progress,
    studentState: deriveStudentCourseState({
      hasAccess: input.hasAccess,
      hasStarted: progressRows.length > 0,
      progress,
      certificateEnabled: input.course.certificateEnabled ?? true,
      certificateIssued: input.certificateIssued,
      salesUrl: lockedState.salesUrl,
    }),
  };
}

async function getProgressForLessonSets(
  db: DB,
  userId: string,
  lessonIdsByCourse: Map<string, string[]>,
): Promise<Map<string, number>> {
  const allLessonIds = Array.from(lessonIdsByCourse.values()).flat();
  if (allLessonIds.length === 0) return new Map();

  const { data, error } = await db
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("is_completed", true)
    .in("lesson_id", allLessonIds);

  logQueryError("getProgressForLessonSets", error);
  const completed = new Set((data ?? []).map((row: Row) => row.lesson_id));
  const result = new Map<string, number>();
  lessonIdsByCourse.forEach((lessonIds, courseId) => {
    const done = lessonIds.reduce((total, lessonId) => total + Number(completed.has(lessonId)), 0);
    result.set(courseId, lessonIds.length ? Math.round((done / lessonIds.length) * 100) : 0);
  });
  return result;
}

/** courseId -> porcentagem concluída, para o aluno da sessão. */
export async function getProgressByCourse(db: DB, userId: string): Promise<Map<string, number>> {
  const [{ data: lessons, error: lessonsError }, { data: progress, error: progressError }] =
    await Promise.all([
      db.from("lessons").select("id, is_published, modules!inner(course_id)").eq("is_published", true),
      db.from("lesson_progress").select("lesson_id, is_completed").eq("user_id", userId).eq("is_completed", true),
    ]);

  logQueryError("getProgressByCourse:lessons", lessonsError);
  logQueryError("getProgressByCourse:progress", progressError);

  const totals = new Map<string, number>();
  const lessonToCourse = new Map<string, string>();
  (lessons ?? []).forEach((lesson: Row) => {
    const courseId = lesson.modules?.course_id;
    if (!courseId) return;
    lessonToCourse.set(lesson.id, courseId);
    totals.set(courseId, (totals.get(courseId) ?? 0) + 1);
  });

  const done = new Map<string, number>();
  (progress ?? []).forEach((entry: Row) => {
    const courseId = lessonToCourse.get(entry.lesson_id);
    if (!courseId) return;
    done.set(courseId, (done.get(courseId) ?? 0) + 1);
  });

  const result = new Map<string, number>();
  totals.forEach((total, courseId) => {
    result.set(courseId, total ? Math.round(((done.get(courseId) ?? 0) / total) * 100) : 0);
  });
  return result;
}

export async function getCourseCategories(db: DB): Promise<string[]> {
  const { data, error } = await db
    .from("courses")
    .select("category, modules(lessons(id, is_published))")
    .eq("is_published", true)
    .neq("status", "Arquivado");
  logQueryError("getCourseCategories", error);

  const validCategories = (data ?? [])
    .filter((row: Row) => {
      const lessons = (row.modules ?? []).flatMap((mod: Row) =>
        (mod.lessons ?? []).filter((l: Row) => l.is_published !== false),
      );
      return lessons.length > 0;
    })
    .map((row: Row) => row.category)
    .filter(Boolean);

  return Array.from(new Set(validCategories)).sort();
}

// ---------------------------------------------------------------------------
// Curso completo
// ---------------------------------------------------------------------------

const COURSE_TREE_SELECT = `
  id, slug, title, description, short_description, category, cover_url, duration,
  level, price, tags, status, is_published, is_featured, created_at, updated_at,
  enable_certificates, drip_content, enable_comments, require_sequential_progress,
  access_expiration_days, max_students, sales_url, sales_page_url, sales_config,
  modules (
    id, course_id, title, slug, description, cover_url, order_index,
    lessons (
      id, module_id, title, type, video_url, pandavideo_id, content, blocks, duration_in_minutes,
      order_index, is_published, slug, transcription, short_description, quiz_id,
      profile_test_id, profile_test_ref, profile_test_config, topics, solves,
      level, objective, audience, prerequisites, is_eligible_for_trail,
      attachments ( id, name, url )
    )
  )
`;

const COURSE_OUTLINE_SELECT = `
  id, slug, title, description, short_description, category, cover_url, duration,
  level, price, tags, status, is_published, is_featured, created_at, updated_at,
  sales_url, sales_page_url, sales_config,
  modules (
    id, course_id, title, slug, description, cover_url, order_index,
    lessons (
      id, module_id, title, type, duration_in_minutes, order_index,
      is_published, slug, quiz_id
    )
  )
`;

const LESSON_DETAIL_SELECT = `
  id, module_id, title, type, video_url, pandavideo_id, content, blocks,
  duration_in_minutes, order_index, is_published, slug, transcription,
  short_description, quiz_id, profile_test_id, profile_test_ref, profile_test_config,
  topics, solves, level, objective, audience, prerequisites,
  is_eligible_for_trail, attachments ( id, name, url )
`;

function assembleCourse(row: Row, progressByLesson: Map<string, Row>): Course {
  const modules: Module[] = (row.modules ?? [])
    .slice()
    .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((mod: Row) => ({
      id: mod.id,
      courseId: mod.course_id,
      title: mod.title,
      slug: mod.slug ?? undefined,
      description: mod.description ?? undefined,
      coverUrl: mod.cover_url ?? undefined,
      order: mod.order_index ?? 0,
      lessons: (mod.lessons ?? [])
        .slice()
        .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((lesson: Row) => mapLesson(lesson, progressByLesson.get(lesson.id))),
    }));

  return mapCourse(row, modules);
}

function assembleCourseOutline(row: Row, progressByLesson: Map<string, Row>): CourseOutline {
  const modules: CourseOutlineModule[] = (row.modules ?? [])
    .slice()
    .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((mod: Row) => ({
      id: mod.id,
      courseId: mod.course_id,
      title: mod.title,
      slug: mod.slug ?? undefined,
      description: mod.description ?? undefined,
      coverUrl: mod.cover_url ?? undefined,
      order: mod.order_index ?? 0,
      lessons: (mod.lessons ?? [])
        .slice()
        .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((lesson: Row) => {
          const progress = progressByLesson.get(lesson.id);
          return {
            id: lesson.id,
            moduleId: lesson.module_id ?? undefined,
            title: lesson.title,
            type: (lesson.type ?? "video") as Lesson["type"],
            durationInMinutes: lesson.duration_in_minutes ?? 0,
            order: lesson.order_index ?? 0,
            isPublished: lesson.is_published ?? true,
            isCompleted: progress?.is_completed ?? false,
            userRating: progress?.user_rating ?? undefined,
            lastWatchedSecond: progress?.last_watched_second ?? 0,
            slug: lesson.slug ?? undefined,
          };
        }),
    }));

  return { ...mapCourse(row), modules };
}

/** Aceita id (uuid) ou slug — a URL pública usa slug, o admin usa id. */
export async function getCourse(
  db: DB,
  idOrSlug: string,
  userId?: string | null,
): Promise<Course | null> {
  const column = isUuid(idOrSlug) ? "id" : "slug";
  const { data, error } = await db.from("courses").select(COURSE_TREE_SELECT).eq(column, idOrSlug).maybeSingle();

  logQueryError("getCourse", error);

  /*
   * Falha de query não é "curso não existe".
   *
   * Enquanto os dois casos voltavam `null`, uma coluna faltando no banco
   * (migration não aplicada) chegava na tela como 404 — a página dizia que o
   * curso não existia enquanto ele estava lá, e o log do erro real ficava só
   * no servidor. Erro sobe e vira tela de erro; ausência de linha (inclusive
   * bloqueio por RLS, que devolve `data` vazio sem `error`) continua `null`.
   */
  if (error) {
    throw new Error(`Não foi possível carregar o curso ${idOrSlug}: ${error.message}`);
  }
  if (!data) return null;

  const progressByLesson = userId ? await getLessonProgressMap(db, userId) : new Map<string, Row>();
  return assembleCourse(data, progressByLesson);
}

/** Curso sem conteúdo, blocos, transcrições ou anexos das aulas. */
export async function getCourseOutline(
  db: DB,
  idOrSlug: string,
  userId?: string | null,
): Promise<CourseOutline | null> {
  const column = isUuid(idOrSlug) ? "id" : "slug";
  const { data, error } = await db
    .from("courses")
    .select(COURSE_OUTLINE_SELECT)
    .eq(column, idOrSlug)
    .maybeSingle();

  logQueryError("getCourseOutline", error);
  if (error) throw new Error(`Não foi possível carregar o curso ${idOrSlug}: ${error.message}`);
  if (!data) return null;

  const lessonIds = (data.modules ?? []).flatMap((mod: Row) =>
    (mod.lessons ?? []).map((lesson: Row) => lesson.id),
  );
  const progressByLesson = userId
    ? await getLessonProgressMap(db, userId, lessonIds)
    : new Map<string, Row>();
  return assembleCourseOutline(data, progressByLesson);
}

export async function getLessonProgressMap(
  db: DB,
  userId: string,
  lessonIds?: string[],
): Promise<Map<string, Row>> {
  let query = db
    .from("lesson_progress")
    .select("lesson_id, is_completed, user_rating, last_watched_second, completed_at")
    .eq("user_id", userId);

  if (lessonIds) {
    if (lessonIds.length === 0) return new Map();
    query = query.in("lesson_id", lessonIds);
  }

  const { data, error } = await query;

  logQueryError("getLessonProgressMap", error);
  return new Map((data ?? []).map((row: Row) => [row.lesson_id, row]));
}

/** Aula única com o curso e os vizinhos necessários para a navegação. */
export async function getLessonWithCourse(
  db: DB,
  courseIdOrSlug: string,
  lessonId: string,
  userId?: string | null,
): Promise<{ course: CourseOutline; lesson: Lesson } | null> {
  const [course, lessonResult] = await Promise.all([
    getCourseOutline(db, courseIdOrSlug, userId),
    db.from("lessons").select(LESSON_DETAIL_SELECT).eq("id", lessonId).maybeSingle(),
  ]);
  if (!course) return null;

  logQueryError("getLessonWithCourse:lesson", lessonResult.error);
  if (lessonResult.error) {
    throw new Error(`Não foi possível carregar a aula ${lessonId}: ${lessonResult.error.message}`);
  }

  const outlineLesson = course.modules.flatMap((mod) => mod.lessons).find((item) => item.id === lessonId);
  if (!outlineLesson || !lessonResult.data) return null;

  const lesson = mapLesson(lessonResult.data, {
    is_completed: outlineLesson.isCompleted,
    user_rating: outlineLesson.userRating,
    last_watched_second: outlineLesson.lastWatchedSecond,
  });
  return { course, lesson };
}

export async function getCourseById(db: DB, id: string): Promise<Course | null> {
  return getCourse(db, id);
}

/** Lista rasa, para selects e telas de gestão. */
export async function listCoursesShallow(db: DB, includeUnpublished = false): Promise<CatalogCourse[]> {
  let query = db
    .from("courses")
    .select("id, slug, title, category, description, short_description, cover_url, duration, level")
    .order("title", { ascending: true });

  if (!includeUnpublished) query = query.eq("is_published", true);

  const { data, error } = await query;
  logQueryError("listCoursesShallow", error);

  return (data ?? []).map((row: Row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category ?? "Geral",
    description: row.short_description || row.description || "",
    cover: row.cover_url || FALLBACK_COVER,
    duration: row.duration || "—",
    lessonCount: 0,
    level: row.level ?? "Essencial",
  }));
}

// ---------------------------------------------------------------------------
// Aluno
// ---------------------------------------------------------------------------

export async function getEnrolledCourses(db: DB, userId: string): Promise<CatalogCourse[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("enrollments")
    .select(
      "course_id, expires_at, courses!inner(id, slug, title, category, description, short_description, cover_url, duration, level, status, is_published, modules(id, lessons(id, duration_in_minutes, is_published)))",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  logQueryError("getEnrolledCourses", error);
  if (!data) return [];

  // Filter out any archived courses for students
  const activeEntries = data.filter((entry: Row) => entry.courses?.status !== "Arquivado");

  const lessonIdsByCourse = new Map<string, string[]>();
  for (const entry of activeEntries) {
    const course = (entry as Row).courses;
    const lessonIds = (course.modules ?? []).flatMap((mod: Row) =>
      (mod.lessons ?? [])
        .filter((lesson: Row) => lesson.is_published !== false)
        .map((lesson: Row) => lesson.id),
    );
    lessonIdsByCourse.set(course.id, lessonIds);
  }
  const progressByCourse = await getProgressForLessonSets(db, userId, lessonIdsByCourse);

  return activeEntries.map((entry: Row) => {
    const row = entry.courses;
    const lessons = (row.modules ?? []).flatMap((mod: Row) =>
      (mod.lessons ?? []).filter((lesson: Row) => lesson.is_published !== false),
    );
    const totalMinutes = lessons.reduce(
      (sum: number, lesson: Row) => sum + (lesson.duration_in_minutes ?? 0),
      0,
    );
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category ?? "Geral",
      description: row.short_description || row.description || "",
      cover: row.cover_url || FALLBACK_COVER,
      duration: row.duration || formatDuration(totalMinutes),
      lessonCount: lessons.length,
      level: row.level ?? "Essencial",
      progress: progressByCourse.get(row.id) ?? 0,
    } satisfies CatalogCourse;
  });
}

/** Aulas já iniciadas e ainda não concluídas, mais recentes primeiro. */
export async function getContinueLessons(db: DB, userId: string, limit = 4): Promise<ContinueLesson[]> {
  const { data, error } = await db
    .from("lesson_progress")
    .select(
      "lesson_id, last_watched_second, lessons!inner(id, title, duration_in_minutes, modules!inner(id, title, course_id, courses!inner(id, slug, title, cover_url, status)))",
    )
    .eq("user_id", userId)
    .eq("is_completed", false)
    .gt("last_watched_second", 0)
    .limit(limit);

  logQueryError("getContinueLessons", error);

  return (data ?? [])
    .filter((row: Row) => row.lessons?.modules?.courses?.status !== "Arquivado")
    .map((row: Row) => {
      const lesson = row.lessons;
      const mod = lesson.modules;
      const course = mod.courses;
      const totalSeconds = (lesson.duration_in_minutes ?? 0) * 60;
      return {
        id: lesson.id,
        courseId: course.id,
        title: lesson.title,
        moduleName: `${course.title} · ${mod.title}`,
        duration: `${lesson.duration_in_minutes ?? 0} min`,
        cover: course.cover_url || FALLBACK_COVER,
        progress: totalSeconds
          ? Math.min(100, Math.round(((row.last_watched_second ?? 0) / totalSeconds) * 100))
          : 0,
      } satisfies ContinueLesson;
    });
}

export async function isEnrolled(db: DB, userId: string, courseId: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .maybeSingle();
  return !!data;
}

// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
