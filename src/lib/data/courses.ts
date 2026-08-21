import type {
  CatalogCourse,
  ContinueLesson,
  Course,
  CourseLayout,
  CourseOutline,
  CourseOutlineModule,
  GalleryLesson,
  HomeCarouselRow,
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
    coverUrl: row.cover_url ?? undefined,
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
    layout: (row.layout ?? "modules") as CourseLayout,
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
    homeCarousel: row.home_carousel ?? false,
    salesUrl: row.sales_url ?? null,
    salesPageUrl: row.sales_page_url ?? null,
    salesConfig: row.sales_config ?? null,
    instructorNames: row.instructor_names ?? [],
    coordinatorName: row.coordinator_name ?? undefined,
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
    .from("v_course_metrics")
    .select(
      "id, slug, title, category, description, short_description, cover_url, duration, level, order_index, created_at, status, is_published, sales_url, sales_config, enable_certificates, lesson_count, total_duration_minutes",
    )
    .eq("is_published", true)
    .neq("status", "Arquivado")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  logQueryError("getCatalogCourses", error);

  if (!data) return [];

  const courses = data
    .map((row: Row) => {
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category ?? "Geral",
        description: row.short_description || row.description || "",
        cover: row.cover_url || FALLBACK_COVER,
        duration: row.duration || formatDuration(row.total_duration_minutes ?? 0),
        lessonCount: row.lesson_count ?? 0,
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
  const [progressResult, enrollmentsResult, subscriptionsResult, certificatesResult] = await Promise.all([
    db
      .from("v_user_course_progress")
      .select("course_id, completed_lessons, started_lessons")
      .eq("user_id", userId),
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
  const progressByCourse = new Map(
    (progressResult.data ?? []).map((row: Row) => [row.course_id, row]),
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
      progressRow: progressByCourse.get(course.id),
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
  progressRow?: Row;
  hasAccess: boolean;
  certificateIssued: boolean;
}): Pick<CatalogCourse, "progress" | "studentState"> {
  const completedLessons = input.progressRow?.completed_lessons ?? 0;
  const startedLessons = input.progressRow?.started_lessons ?? 0;
  
  const progress = input.course.lessonCount > 0
    ? Math.round((completedLessons / input.course.lessonCount) * 100)
    : 0;
    
  const lockedState = input.course.studentState?.kind === "locked"
    ? input.course.studentState
    : { kind: "locked" as const, salesUrl: null };

  return {
    progress,
    studentState: deriveStudentCourseState({
      hasAccess: input.hasAccess,
      hasStarted: startedLessons > 0,
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
  const [{ data: courses, error: coursesError }, { data: progress, error: progressError }] =
    await Promise.all([
      db.from("v_course_metrics").select("id, lesson_count").eq("is_published", true),
      db.from("v_user_course_progress").select("course_id, completed_lessons").eq("user_id", userId),
    ]);

  logQueryError("getProgressByCourse:courses", coursesError);
  logQueryError("getProgressByCourse:progress", progressError);

  const result = new Map<string, number>();
  
  const completedMap = new Map<string, number>();
  (progress ?? []).forEach((entry: Row) => {
    completedMap.set(entry.course_id, entry.completed_lessons ?? 0);
  });

  (courses ?? []).forEach((course: Row) => {
    const total = course.lesson_count ?? 0;
    const done = completedMap.get(course.id) ?? 0;
    result.set(course.id, total > 0 ? Math.round((done / total) * 100) : 0);
  });

  return result;
}

/**
 * Como `getProgressByCourse`, mas para vários usuários de uma vez.
 *
 * Existe para quem monta uma lista de pessoas (ex.: membros de uma empresa)
 * e precisa do progresso de cada uma — chamar `getProgressByCourse` num loop
 * vira N+1 (2 queries por pessoa); aqui são sempre 2 queries no total.
 */
export async function getProgressByCourseForUsers(
  db: DB,
  userIds: string[],
): Promise<Map<string, Map<string, number>>> {
  const result = new Map<string, Map<string, number>>();
  if (userIds.length === 0) return result;

  const [{ data: courses, error: coursesError }, { data: progress, error: progressError }] =
    await Promise.all([
      db.from("v_course_metrics").select("id, lesson_count").eq("is_published", true),
      db.from("v_user_course_progress").select("course_id, user_id, completed_lessons").in("user_id", userIds),
    ]);

  logQueryError("getProgressByCourseForUsers:courses", coursesError);
  logQueryError("getProgressByCourseForUsers:progress", progressError);

  const lessonCountByCourse = new Map<string, number>(
    (courses ?? []).map((course: Row) => [course.id, course.lesson_count ?? 0]),
  );
  const completedByUserCourse = new Map<string, number>();
  (progress ?? []).forEach((row: Row) => {
    completedByUserCourse.set(`${row.user_id}:${row.course_id}`, row.completed_lessons ?? 0);
  });

  userIds.forEach((userId) => {
    const byCourse = new Map<string, number>();
    lessonCountByCourse.forEach((total, courseId) => {
      const done = completedByUserCourse.get(`${userId}:${courseId}`) ?? 0;
      byCourse.set(courseId, total > 0 ? Math.round((done / total) * 100) : 0);
    });
    result.set(userId, byCourse);
  });

  return result;
}

export async function getCourseCategories(db: DB): Promise<string[]> {
  const { data, error } = await db
    .from("v_course_metrics")
    .select("category, lesson_count")
    .eq("is_published", true)
    .neq("status", "Arquivado");
  logQueryError("getCourseCategories", error);

  const validCategories = (data ?? [])
    .filter((row: Row) => (row.lesson_count ?? 0) > 0)
    .map((row: Row) => row.category)
    .filter(Boolean);

  return Array.from(new Set(validCategories)).sort();
}

// ---------------------------------------------------------------------------
// Curso completo
// ---------------------------------------------------------------------------

const COURSE_TREE_SELECT = `
  id, slug, title, description, short_description, category, cover_url, duration,
  level, price, tags, status, layout, home_carousel, is_published, is_featured,
  created_at, updated_at,
  enable_certificates, drip_content, enable_comments, require_sequential_progress,
  access_expiration_days, max_students, sales_url, sales_page_url, sales_config,
  modules (
    id, course_id, title, slug, description, cover_url, order_index,
    lessons (
      id, module_id, title, type, video_url, pandavideo_id, content, blocks, duration_in_minutes,
      order_index, is_published, slug, cover_url, transcription, short_description, quiz_id,
      profile_test_id, profile_test_ref, profile_test_config, topics, solves,
      level, objective, audience, prerequisites, is_eligible_for_trail,
      attachments ( id, name, url )
    )
  )
`;

const COURSE_OUTLINE_SELECT = `
  id, slug, title, description, short_description, category, cover_url, duration,
  level, price, tags, status, layout, home_carousel, is_published, is_featured,
  created_at, updated_at,
  enable_certificates, sales_url, sales_page_url, sales_config,
  modules (
    id, course_id, title, slug, description, cover_url, order_index,
    lessons (
      id, module_id, title, type, duration_in_minutes, order_index,
      is_published, slug, cover_url, short_description, quiz_id
    )
  )
`;

const LESSON_DETAIL_SELECT = `
  id, module_id, title, type, video_url, pandavideo_id, content, blocks,
  duration_in_minutes, order_index, is_published, slug, cover_url, transcription,
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
            shortDescription: lesson.short_description ?? undefined,
            coverUrl: lesson.cover_url ?? undefined,
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
  lessonIdOrSlug: string,
  userId?: string | null,
): Promise<{ course: CourseOutline; lesson: Lesson } | null> {
  const lessonColumn = isUuid(lessonIdOrSlug) ? "id" : "slug";
  const [course, lessonResult] = await Promise.all([
    getCourseOutline(db, courseIdOrSlug, userId),
    db.from("lessons").select(LESSON_DETAIL_SELECT).eq(lessonColumn, lessonIdOrSlug).maybeSingle(),
  ]);
  if (!course) return null;

  logQueryError("getLessonWithCourse:lesson", lessonResult.error);
  if (lessonResult.error) {
    throw new Error(`Não foi possível carregar a aula ${lessonIdOrSlug}: ${lessonResult.error.message}`);
  }

  const outlineLesson = course.modules.flatMap((mod) => mod.lessons).find((item) => item.id === lessonIdOrSlug || item.slug === lessonIdOrSlug);
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
// Curso galeria
// ---------------------------------------------------------------------------

/** Quantas aulas o carrossel da home publica por curso. */
export const HOME_CAROUSEL_SIZE = 8;

function lessonHref(courseUrlId: string, lesson: Row): string {
  return `/courses/${courseUrlId}/lessons/${lesson.slug || lesson.id}`;
}

/**
 * Acesso a um conjunto de cursos, pelas mesmas regras do catálogo (matrícula
 * ativa ou plano cujas `features` cubram o curso) — mais o bypass de admin,
 * que `hasCourseAccess` sozinho não sabe: sem ele, o próprio admin veria o
 * curso que acabou de criar como travado ao pré-visualizá-lo.
 *
 * Existe separado de `getCatalogCourses` de propósito: aqui o objetivo é só
 * "esse curso está travado?", sem montar cartão de catálogo — usado tanto
 * pela capa do curso galeria quanto pelo carrossel da home.
 */
async function getCourseAccessMap(
  db: DB,
  userId: string,
  courseIds: string[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (courseIds.length === 0) return result;

  const { data: profile } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role === "admin") {
    courseIds.forEach((id) => result.set(id, true));
    return result;
  }

  const now = new Date();
  const [enrollmentsResult, subscriptionsResult] = await Promise.all([
    db.from("enrollments").select("course_id, status, expires_at").eq("user_id", userId).in("course_id", courseIds),
    db
      .from("subscriptions")
      .select("status, current_period_end, plans!inner(features, is_active)")
      .eq("user_id", userId),
  ]);
  logQueryError("getCourseAccessMap:enrollments", enrollmentsResult.error);
  logQueryError("getCourseAccessMap:subscriptions", subscriptionsResult.error);

  const enrolledCourseIds = new Set(
    (enrollmentsResult.data ?? [])
      .filter((row: Row) => isEnrollmentActive({ status: row.status, expiresAt: row.expires_at }, now))
      .map((row: Row) => row.course_id),
  );
  const activePlanFeatures = (subscriptionsResult.data ?? [])
    .filter((row: Row) => {
      if (!isSubscriptionActive({ status: row.status, currentPeriodEnd: row.current_period_end }, now)) return false;
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return plan?.is_active !== false;
    })
    .map((row: Row) => {
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return plan?.features;
    });

  courseIds.forEach((courseId) => {
    result.set(courseId, hasCourseAccess({ courseId, enrolledCourseIds, activePlanFeatures }));
  });
  return result;
}

/**
 * Aulas de curso(s) galeria pela `gallery_lesson_previews` — nunca pela tabela
 * crua. `lessons`/`modules` só liberam SELECT para quem tem matrícula (ver as
 * policies em `20260815115400_security_enhancements` e
 * `20260820120000_add_enrollment_expiration`), então buscar direto ali faria a
 * prévia sumir por completo para quem ainda não comprou — exatamente o
 * contrário do que a vitrine "veja travado, compre se quiser" precisa. A view
 * expõe só as colunas de vitrine (sem video_url/content/blocks/transcription);
 * ver `20260821110000_gallery_lesson_previews`.
 */
async function getGalleryLessonPreviews(db: DB, courseIds: string[]): Promise<Map<string, Row[]>> {
  const byCourse = new Map<string, Row[]>();
  if (courseIds.length === 0) return byCourse;

  const { data, error } = await db
    .from("gallery_lesson_previews")
    .select("id, course_id, title, cover_url, duration_in_minutes, short_description, slug, order_index, created_at")
    .in("course_id", courseIds);

  logQueryError("getGalleryLessonPreviews", error);
  (data ?? []).forEach((row: Row) => {
    const list = byCourse.get(row.course_id) ?? [];
    list.push(row);
    byCourse.set(row.course_id, list);
  });
  return byCourse;
}

const GALLERY_COURSE_SELECT = `
  id, slug, title, description, short_description, category, cover_url, duration,
  level, price, tags, status, layout, home_carousel, is_published, is_featured,
  created_at, updated_at, enable_certificates, sales_url, sales_page_url, sales_config
`;

/**
 * Sonda leve para decidir, antes de buscar o resto, se o curso é galeria ou
 * módulos — cada tipo lê as aulas de um jeito diferente (ver `getGalleryCourse`
 * vs. `getCourseOutline`), então a capa pública precisa saber isso primeiro.
 */
export async function getCourseLayoutMeta(
  db: DB,
  idOrSlug: string,
): Promise<{ id: string; slug: string; status?: string; layout: CourseLayout } | null> {
  const column = isUuid(idOrSlug) ? "id" : "slug";
  const { data, error } = await db.from("courses").select("id, slug, status, layout").eq(column, idOrSlug).maybeSingle();

  logQueryError("getCourseLayoutMeta", error);
  if (error) throw new Error(`Não foi possível carregar o curso ${idOrSlug}: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    status: data.status ?? undefined,
    layout: (data.layout ?? "modules") as CourseLayout,
  };
}

/**
 * Curso galeria completo para a capa pública (`/courses/[slug]`).
 *
 * Sempre lê as aulas pela prévia (ver `getGalleryLessonPreviews`) — quem não
 * tem acesso vê a mesma galeria, só que travada, em vez de uma tela vazia.
 * Progresso e marcação de concluído só entram quando `locked` é falso: aula
 * travada não tem "concluída", tem "compre para assistir".
 */
export async function getGalleryCourse(
  db: DB,
  idOrSlug: string,
  userId?: string | null,
): Promise<{ course: Course; lessons: GalleryLesson[]; locked: boolean } | null> {
  const column = isUuid(idOrSlug) ? "id" : "slug";
  const { data, error } = await db.from("courses").select(GALLERY_COURSE_SELECT).eq(column, idOrSlug).maybeSingle();

  logQueryError("getGalleryCourse", error);
  if (error) throw new Error(`Não foi possível carregar o curso ${idOrSlug}: ${error.message}`);
  if (!data) return null;

  const course = mapCourse(data);
  const accessByCourse = userId ? await getCourseAccessMap(db, userId, [course.id]) : new Map<string, boolean>();
  const locked = !(accessByCourse.get(course.id) ?? false);

  const lessonsByCourse = await getGalleryLessonPreviews(db, [course.id]);
  const rawLessons = (lessonsByCourse.get(course.id) ?? [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const progressByLesson = !locked && userId
    ? await getLessonProgressMap(db, userId, rawLessons.map((lesson) => lesson.id))
    : new Map<string, Row>();

  const courseUrlId = course.slug || course.id;
  const fallbackCover = course.coverUrl || FALLBACK_COVER;

  const lessons: GalleryLesson[] = rawLessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    cover: (lesson.cover_url ?? "").trim() || fallbackCover,
    durationInMinutes: lesson.duration_in_minutes ?? 0,
    shortDescription: lesson.short_description ?? undefined,
    isCompleted: locked ? false : (progressByLesson.get(lesson.id)?.is_completed ?? false),
    locked,
    href: lessonHref(courseUrlId, lesson),
  }));

  return { course, lessons, locked };
}

/**
 * As faixas do carrossel da home — um curso galeria marcado, uma faixa.
 *
 * Diferente da galeria do curso, aqui a ordem é cronológica: a promessa da
 * faixa é "o que entrou por último", então quem manda é `created_at` da aula, e
 * não a ordem editorial da coleção. Aparece para todo mundo, matriculado ou
 * não — quem não tem acesso vê a mesma faixa travada, com CTA de matrícula.
 */
export async function getHomeCarouselRows(db: DB, userId?: string | null): Promise<HomeCarouselRow[]> {
  const { data: courseRows, error } = await db
    .from("courses")
    .select("id, slug, title, cover_url, order_index, sales_url, sales_config")
    .eq("layout", "gallery")
    .eq("home_carousel", true)
    .eq("is_published", true)
    .neq("status", "Arquivado")
    .order("order_index", { ascending: true });

  logQueryError("getHomeCarouselRows", error);
  if (!courseRows || courseRows.length === 0) return [];

  const courseIds = courseRows.map((row: Row) => row.id);
  const [lessonsByCourse, accessByCourse] = await Promise.all([
    getGalleryLessonPreviews(db, courseIds),
    userId ? getCourseAccessMap(db, userId, courseIds) : Promise.resolve(new Map<string, boolean>()),
  ]);

  const rowsWithLessons = courseRows
    .map((row: Row) => ({
      row,
      locked: !(accessByCourse.get(row.id) ?? false),
      lessons: (lessonsByCourse.get(row.id) ?? [])
        .slice()
        .sort((a: Row, b: Row) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, HOME_CAROUSEL_SIZE),
    }))
    .filter((entry) => entry.lessons.length > 0);

  if (rowsWithLessons.length === 0) return [];

  const unlockedLessonIds = rowsWithLessons
    .filter((entry) => !entry.locked)
    .flatMap((entry) => entry.lessons.map((lesson: Row) => lesson.id));
  const progressByLesson = userId && unlockedLessonIds.length > 0
    ? await getLessonProgressMap(db, userId, unlockedLessonIds)
    : new Map<string, Row>();

  return rowsWithLessons.map(({ row, lessons, locked }) => {
    const courseUrlId = row.slug || row.id;
    const fallbackCover = row.cover_url || FALLBACK_COVER;

    return {
      courseId: row.id,
      courseSlug: row.slug ?? undefined,
      courseTitle: row.title,
      courseHref: `/courses/${courseUrlId}`,
      locked,
      salesUrl: getCourseSalesTemplate({ salesUrl: row.sales_url, salesConfig: row.sales_config }),
      lessons: lessons.map((lesson: Row) => ({
        id: lesson.id,
        title: lesson.title,
        cover: (lesson.cover_url ?? "").trim() || fallbackCover,
        durationInMinutes: lesson.duration_in_minutes ?? 0,
        shortDescription: lesson.short_description ?? undefined,
        isCompleted: locked ? false : (progressByLesson.get(lesson.id)?.is_completed ?? false),
        locked,
        href: lessonHref(courseUrlId, lesson),
      })),
    } satisfies HomeCarouselRow;
  });
}

// ---------------------------------------------------------------------------
// Aluno
// ---------------------------------------------------------------------------

export async function getEnrolledCourses(db: DB, userId: string): Promise<CatalogCourse[]> {
  const nowIso = new Date().toISOString();
  
  // 1. Get enrolled course IDs
  const { data: enrollments, error: enrollmentsError } = await db
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  logQueryError("getEnrolledCourses:enrollments", enrollmentsError);
  if (!enrollments || enrollments.length === 0) return [];
  const courseIds = enrollments.map((e) => e.course_id);

  // 2. Get course metrics and user progress
  const [coursesResult, progressResult] = await Promise.all([
    db.from("v_course_metrics")
      .select("id, slug, title, category, description, short_description, cover_url, duration, level, status, is_published, lesson_count, total_duration_minutes")
      .in("id", courseIds)
      .neq("status", "Arquivado"),
    db.from("v_user_course_progress")
      .select("course_id, completed_lessons")
      .eq("user_id", userId)
      .in("course_id", courseIds)
  ]);
  
  const coursesData = coursesResult.data ?? [];
  const progressData = progressResult.data ?? [];
  const progressMap = new Map(progressData.map((p: Row) => [p.course_id, p.completed_lessons]));

  return coursesData.map((row: Row) => {
    const lessonCount = row.lesson_count ?? 0;
    const completedLessons = progressMap.get(row.id) ?? 0;
    const progress = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;
    
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category ?? "Geral",
      description: row.short_description || row.description || "",
      cover: row.cover_url || FALLBACK_COVER,
      duration: row.duration || formatDuration(row.total_duration_minutes ?? 0),
      lessonCount,
      level: row.level ?? "Essencial",
      progress,
    } satisfies CatalogCourse;
  });
}

/** Aulas já iniciadas e ainda não concluídas, mais recentes primeiro. */
export async function getContinueLessons(db: DB, userId: string, limit = 4): Promise<ContinueLesson[]> {
  const { data, error } = await db
    .from("lesson_progress")
    .select(
      "lesson_id, last_watched_second, lessons!inner(id, slug, title, duration_in_minutes, modules!inner(id, title, course_id, courses!inner(id, slug, title, cover_url, status)))",
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
        slug: lesson.slug,
        courseId: course.id,
        courseSlug: course.slug,
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
