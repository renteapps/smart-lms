import "server-only";

import { hasCourseAccess, isEnrollmentActive, isSubscriptionActive } from "@/lib/courseAccess";
import { extractBlocksText } from "@/lib/platformAssistantContext";
import type {
  HydratedBody,
  IndexArticle,
  IndexCourse,
  IndexLesson,
  IndexPilula,
  IndexPlan,
  KnowledgeCandidate,
  PlatformIndex,
} from "@/lib/platformAssistantKnowledge";
import { EMPTY_PLATFORM_INDEX } from "@/lib/platformAssistantKnowledge";
import { logQueryError, type DB, type Row } from "@/lib/data/types";
import type { LessonContentBlock } from "@/types/course";

/*
 * O índice é o mesmo para todos os alunos — só conteúdo publicado entra nele.
 * O que muda por aluno é o acesso, aplicado na hora de anexar o corpo da aula.
 * Por isso o cache é global e curto: alteração no admin aparece no assistente
 * em no máximo cinco minutos, sem refazer a varredura a cada pergunta.
 */
const INDEX_TTL_MS = 5 * 60_000;

let cached: PlatformIndex | null = null;
let inFlight: Promise<PlatformIndex> | null = null;

export function invalidatePlatformIndex(): void {
  cached = null;
  inFlight = null;
}

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
}

async function fetchCourses(db: DB): Promise<IndexCourse[]> {
  const { data, error } = await db
    .from("courses")
    .select(
      `id, slug, title, category, level, description, short_description, layout, order_index,
       modules ( id, title, order_index,
         lessons ( id, slug, title, short_description, objective, topics, solves, level, duration_in_minutes, order_index, is_published )
       )`,
    )
    .eq("is_published", true)
    .neq("status", "Arquivado")
    .order("order_index", { ascending: true });

  logQueryError("platformAssistantIndex:courses", error);
  if (!data) return [];

  return data
    .map((row: Row): IndexCourse => {
      const isGallery = row.layout === "gallery";
      const modules = (row.modules ?? [])
        .slice()
        .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((mod: Row) => ({
          id: mod.id,
          title: mod.title ?? "",
          lessons: (mod.lessons ?? [])
            .filter((lesson: Row) => lesson.is_published !== false)
            .slice()
            .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((lesson: Row): IndexLesson => ({
              id: lesson.id,
              slug: lesson.slug ?? undefined,
              courseId: row.id,
              title: lesson.title ?? "",
              moduleTitle: isGallery ? undefined : (mod.title ?? undefined),
              shortDescription: lesson.short_description ?? undefined,
              objective: lesson.objective ?? undefined,
              topics: textArray(lesson.topics),
              solves: textArray(lesson.solves),
              level: lesson.level ?? undefined,
              durationInMinutes: lesson.duration_in_minutes ?? 0,
              order: lesson.order_index ?? 0,
            })),
        }));

      return {
        id: row.id,
        slug: row.slug ?? undefined,
        title: row.title ?? "",
        category: row.category ?? "Geral",
        level: row.level ?? "Essencial",
        shortDescription: row.short_description ?? undefined,
        description: row.description ?? undefined,
        isGallery,
        modules,
      };
    })
    .filter((course: IndexCourse) => course.modules.some((module) => module.lessons.length > 0));
}

async function fetchArticles(db: DB): Promise<IndexArticle[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("articles")
    .select("slug, title, category, excerpt, author, reading_time")
    .eq("is_published", true)
    .lte("published_at", nowIso)
    .order("published_at", { ascending: false });

  logQueryError("platformAssistantIndex:articles", error);
  return (data ?? []).map((row: Row) => ({
    slug: row.slug,
    title: row.title ?? "",
    category: row.category ?? "Geral",
    excerpt: row.excerpt ?? "",
    author: row.author ?? undefined,
    readingTime: row.reading_time ?? undefined,
  }));
}

async function fetchPlans(db: DB): Promise<IndexPlan[]> {
  const { data, error } = await db
    .from("plans")
    .select("id, name, description, price, frequency, features")
    .eq("is_active", true);

  logQueryError("platformAssistantIndex:plans", error);
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    frequency: row.frequency ?? "monthly",
    // `features` guarda tanto a lista simples quanto o objeto de configuração
    // do plano (ver mapPlan); só a lista de benefícios interessa ao assistente.
    features: Array.isArray(row.features) ? textArray(row.features) : textArray(row.features?.items),
  }));
}

async function fetchPilulas(db: DB): Promise<IndexPilula[]> {
  const { data, error } = await db
    .from("pilulas")
    .select("id, title, category, format, summary, challenge, estimated_minutes")
    .eq("status", "Ativa");

  logQueryError("platformAssistantIndex:pilulas", error);
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    title: row.title ?? "",
    category: row.category ?? "Geral",
    format: row.format ?? "texto",
    summary: row.summary ?? "",
    challenge: row.challenge ?? "",
    estimatedMinutes: row.estimated_minutes ?? 0,
  }));
}

/** Índice leve de tudo que está publicado, memorizado por poucos minutos. */
export async function getPlatformIndex(db: DB, force = false): Promise<PlatformIndex> {
  if (!force && cached && Date.now() - cached.builtAt < INDEX_TTL_MS) return cached;
  if (!force && inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const [courses, articles, plans, pilulas] = await Promise.all([
        fetchCourses(db),
        fetchArticles(db),
        fetchPlans(db),
        fetchPilulas(db),
      ]);
      cached = { courses, articles, plans, pilulas, builtAt: Date.now() };
      return cached;
    } catch (error) {
      console.error("[platform-assistant:index]", error);
      // Índice vazio degrada para "não encontrei essa informação"; derrubar a
      // resposta inteira por causa da varredura seria pior para o aluno.
      return cached ?? EMPTY_PLATFORM_INDEX;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Cursos que o aluno realmente pode assistir hoje.
 *
 * Usa a mesma regra das vitrines (matrícula ativa ou plano que libera o
 * curso), para o assistente nunca abrir conteúdo que a plataforma tranca — nem
 * trancar conteúdo que ela abre.
 */
export async function getAccessibleCourseIds(db: DB, userId: string, courseIds: string[]): Promise<Set<string>> {
  const now = new Date();
  const [enrollments, subscriptions] = await Promise.all([
    db.from("enrollments").select("course_id, status, expires_at").eq("user_id", userId),
    db
      .from("subscriptions")
      .select("status, current_period_end, plans!inner(features, is_active)")
      .eq("user_id", userId),
  ]);

  logQueryError("platformAssistantIndex:enrollments", enrollments.error);
  logQueryError("platformAssistantIndex:subscriptions", subscriptions.error);

  const enrolledCourseIds = new Set<string>(
    (enrollments.data ?? [])
      .filter((row: Row) => isEnrollmentActive({ status: row.status, expiresAt: row.expires_at }, now))
      .map((row: Row) => row.course_id),
  );

  const activePlanFeatures = (subscriptions.data ?? [])
    .filter((row: Row) => {
      if (!isSubscriptionActive({ status: row.status, currentPeriodEnd: row.current_period_end }, now)) return false;
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return plan?.is_active !== false;
    })
    .map((row: Row) => {
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
      return plan?.features;
    });

  const accessible = new Set<string>();
  for (const courseId of courseIds) {
    if (hasCourseAccess({ courseId, enrolledCourseIds, activePlanFeatures })) accessible.add(courseId);
  }
  return accessible;
}

/**
 * Busca o corpo apenas das fontes escolhidas pelo ranqueamento.
 *
 * Aulas de cursos sem acesso nem chegam à consulta: o texto integral não deve
 * sair do banco quando ele não pode ser usado.
 */
export async function hydrateKnowledgeBodies(
  db: DB,
  selected: KnowledgeCandidate[],
  accessibleCourseIds: ReadonlySet<string>,
  options: { lessons: boolean; transcriptions: boolean; articles: boolean },
): Promise<Map<string, HydratedBody>> {
  const lessonIds = options.lessons
    ? selected
        .filter((item) => item.hydrate?.kind === "lesson" && accessibleCourseIds.has(item.hydrate.courseId))
        .map((item) => item.id)
    : [];
  const articleSlugs = options.articles
    ? selected.filter((item) => item.hydrate?.kind === "article").map((item) => item.id)
    : [];

  const bodies = new Map<string, HydratedBody>();
  if (!lessonIds.length && !articleSlugs.length) return bodies;

  const [lessons, articles] = await Promise.all([
    lessonIds.length
      ? db.from("lessons").select("id, content, blocks, transcription").in("id", lessonIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    articleSlugs.length
      ? db.from("articles").select("slug, body, blocks, audio_transcript").in("slug", articleSlugs)
      : Promise.resolve({ data: [] as Row[], error: null }),
  ]);

  logQueryError("platformAssistantIndex:lessonBodies", lessons.error);
  logQueryError("platformAssistantIndex:articleBodies", articles.error);

  for (const row of lessons.data ?? []) {
    bodies.set(`lesson:${row.id}`, {
      content: [row.content, extractBlocksText(row.blocks as LessonContentBlock[] | undefined)].filter(Boolean).join("\n\n"),
      transcription: options.transcriptions ? (row.transcription ?? undefined) : undefined,
    });
  }
  for (const row of articles.data ?? []) {
    bodies.set(`article:${row.slug}`, {
      content: [row.body, extractBlocksText(row.blocks as LessonContentBlock[] | undefined)].filter(Boolean).join("\n\n"),
      transcription: options.transcriptions ? (row.audio_transcript ?? undefined) : undefined,
    });
  }
  return bodies;
}
