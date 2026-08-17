import type {
  CatalogCourse,
  ContentBlock,
  ContinueLesson,
  Course,
  Lesson,
  Module,
} from "@/types/course";
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
    content: row.content ?? "",
    blocks: Array.isArray(row.blocks) ? (row.blocks as ContentBlock[]) : [],
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
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
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
    isFeatured: row.is_featured ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modules,
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
 * @param userId quando presente, cada cartão volta com o progresso real.
 */
export async function getCatalogCourses(db: DB, userId?: string | null): Promise<CatalogCourse[]> {
  const { data, error } = await db
    .from("courses")
    .select(
      "id, slug, title, category, description, short_description, cover_url, duration, level, order_index, created_at, modules(id, lessons(id, duration_in_minutes, is_published))",
    )
    .eq("is_published", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  logQueryError("getCatalogCourses", error);
  if (!data) return [];

  const courses = data.map((row: Row) => {
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
    } satisfies CatalogCourse;
  });

  if (!userId) return courses;

  const progressByCourse = await getProgressByCourse(db, userId);
  return courses.map((course) => ({
    ...course,
    progress: progressByCourse.get(course.id),
  }));
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
  const { data, error } = await db.from("courses").select("category").eq("is_published", true);
  logQueryError("getCourseCategories", error);
  return Array.from(new Set((data ?? []).map((row: Row) => row.category).filter(Boolean))).sort();
}

// ---------------------------------------------------------------------------
// Curso completo
// ---------------------------------------------------------------------------

const COURSE_TREE_SELECT = `
  id, slug, title, description, short_description, category, cover_url, duration,
  level, price, tags, is_published, is_featured, created_at, updated_at,
  modules (
    id, course_id, title, description, cover_url, order_index,
    lessons (
      id, module_id, title, type, video_url, content, blocks, duration_in_minutes,
      order_index, is_published, slug, meta_title, meta_description,
      profile_test_id, profile_test_ref, profile_test_config, topics, solves,
      level, objective, audience, prerequisites, is_eligible_for_trail,
      attachments ( id, name, url )
    )
  )
`;

function assembleCourse(row: Row, progressByLesson: Map<string, Row>): Course {
  const modules: Module[] = (row.modules ?? [])
    .slice()
    .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((mod: Row) => ({
      id: mod.id,
      courseId: mod.course_id,
      title: mod.title,
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

/** Aceita id (uuid) ou slug — a URL pública usa slug, o admin usa id. */
export async function getCourse(
  db: DB,
  idOrSlug: string,
  userId?: string | null,
): Promise<Course | null> {
  const column = isUuid(idOrSlug) ? "id" : "slug";
  const { data, error } = await db.from("courses").select(COURSE_TREE_SELECT).eq(column, idOrSlug).maybeSingle();

  logQueryError("getCourse", error);
  if (!data) return null;

  const progressByLesson = userId ? await getLessonProgressMap(db, userId) : new Map<string, Row>();
  return assembleCourse(data, progressByLesson);
}

export async function getLessonProgressMap(db: DB, userId: string): Promise<Map<string, Row>> {
  const { data, error } = await db
    .from("lesson_progress")
    .select("lesson_id, is_completed, user_rating, last_watched_second, completed_at")
    .eq("user_id", userId);

  logQueryError("getLessonProgressMap", error);
  return new Map((data ?? []).map((row: Row) => [row.lesson_id, row]));
}

/** Aula única com o curso e os vizinhos necessários para a navegação. */
export async function getLessonWithCourse(
  db: DB,
  courseIdOrSlug: string,
  lessonId: string,
  userId?: string | null,
): Promise<{ course: Course; lesson: Lesson } | null> {
  const course = await getCourse(db, courseIdOrSlug, userId);
  if (!course) return null;

  const lesson = course.modules.flatMap((mod) => mod.lessons).find((item) => item.id === lessonId);
  return lesson ? { course, lesson } : null;
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
  const { data, error } = await db
    .from("enrollments")
    .select(
      "course_id, courses!inner(id, slug, title, category, description, short_description, cover_url, duration, level, modules(id, lessons(id, duration_in_minutes, is_published)))",
    )
    .eq("user_id", userId)
    .eq("status", "active");

  logQueryError("getEnrolledCourses", error);
  if (!data) return [];

  const progressByCourse = await getProgressByCourse(db, userId);

  return data.map((entry: Row) => {
    const row = entry.courses;
    const lessons = (row.modules ?? []).flatMap((mod: Row) => mod.lessons ?? []);
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
      "lesson_id, last_watched_second, lessons!inner(id, title, duration_in_minutes, modules!inner(id, title, course_id, courses!inner(id, slug, title, cover_url)))",
    )
    .eq("user_id", userId)
    .eq("is_completed", false)
    .gt("last_watched_second", 0)
    .limit(limit);

  logQueryError("getContinueLessons", error);

  return (data ?? []).map((row: Row) => {
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
  const { data } = await db
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
