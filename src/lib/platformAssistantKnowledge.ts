import {
  ASSISTANT_MAX_CHARS_PER_SOURCE,
  assistantQueryTerms,
  packAssistantSources,
  rankSources,
  type AssistantContextSource,
  type PackedAssistantContext,
} from "@/lib/platformAssistantContext";
import {
  DEFAULT_ASSISTANT_SOURCES,
  type AssistantKnowledgeSources,
  type AssistantSourceKey,
} from "@/types/platformAssistant";

/*
 * Índice leve da plataforma.
 *
 * Só campos curtos entram aqui: título, ementa, tópicos, objetivo. O corpo das
 * aulas e dos artigos é buscado depois, apenas para o punhado de fontes que o
 * ranqueamento escolheu — carregar todas as transcrições a cada pergunta
 * custaria dezenas de MB para usar menos de 1%.
 */

export type IndexLesson = {
  id: string;
  slug?: string;
  courseId: string;
  title: string;
  moduleTitle?: string;
  shortDescription?: string;
  objective?: string;
  topics: string[];
  solves: string[];
  level?: string;
  durationInMinutes: number;
  order: number;
};

export type IndexCourse = {
  id: string;
  slug?: string;
  title: string;
  category: string;
  level: string;
  shortDescription?: string;
  description?: string;
  isGallery: boolean;
  modules: Array<{ id: string; title: string; lessons: IndexLesson[] }>;
};

export type IndexArticle = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  author?: string;
  readingTime?: number;
};

export type IndexPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  frequency: string;
  features: string[];
};

export type IndexPilula = {
  id: string;
  title: string;
  category: string;
  format: string;
  summary: string;
  challenge: string;
  estimatedMinutes: number;
};

export type PlatformIndex = {
  courses: IndexCourse[];
  articles: IndexArticle[];
  plans: IndexPlan[];
  pilulas: IndexPilula[];
  builtAt: number;
};

export const EMPTY_PLATFORM_INDEX: PlatformIndex = {
  courses: [],
  articles: [],
  plans: [],
  pilulas: [],
  builtAt: 0,
};

/** Quanto do contexto o mapa pode ocupar antes de ser resumido. */
export const PLATFORM_MAP_BUDGET = 24_000;

/** Quantas fontes profundas entram por resposta em cada alcance. */
export const PLATFORM_SOURCE_LIMIT = 14;
export const PLATFORM_COMPLEMENT_LIMIT = 6;

export function normalizeKnowledgeSources(value: unknown): AssistantKnowledgeSources {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const result = { ...DEFAULT_ASSISTANT_SOURCES };
  for (const key of Object.keys(result) as AssistantSourceKey[]) {
    // Chave ausente mantém o padrão: uma migration futura que acrescente uma
    // fonte não pode desligá-la silenciosamente em quem já salvou a config.
    if (typeof raw[key] === "boolean") result[key] = raw[key] as boolean;
  }
  return result;
}

function lessonHref(course: IndexCourse, lesson: IndexLesson): string {
  return `/courses/${course.slug || course.id}/lessons/${lesson.slug || lesson.id}`;
}

function courseHref(course: IndexCourse): string {
  return `/courses/${course.slug || course.id}`;
}

function courseLessons(course: IndexCourse): IndexLesson[] {
  return course.modules.flatMap((module) => module.lessons);
}

type MapDetail = "lessons" | "modules" | "courses";

function renderMap(
  index: PlatformIndex,
  sources: AssistantKnowledgeSources,
  accessibleCourseIds: ReadonlySet<string>,
  detail: MapDetail,
): string {
  const blocks: string[] = [];

  if (sources.courses && index.courses.length) {
    const lines = index.courses.map((course) => {
      const lessons = courseLessons(course);
      const access = accessibleCourseIds.has(course.id) ? "acesso liberado" : "sem matrícula";
      const header = `• ${course.title} — ${course.category} · ${course.level} · ${lessons.length} aula(s) · ${courseHref(course)} · ${access}`;
      if (detail === "courses") return header;
      if (detail === "modules") {
        const modules = course.modules.map((module) => module.title).filter(Boolean);
        return course.isGallery || !modules.length ? header : `${header}\n    Módulos: ${modules.join(" | ")}`;
      }
      const body = course.modules
        .map((module) => {
          const titles = module.lessons.map((lesson) => lesson.title).filter(Boolean);
          if (!titles.length) return "";
          const prefix = course.isGallery ? "    Aulas" : `    ${module.title}`;
          return `${prefix}: ${titles.join(" | ")}`;
        })
        .filter(Boolean)
        .join("\n");
      return body ? `${header}\n${body}` : header;
    });
    blocks.push(`CURSOS PUBLICADOS (${index.courses.length}):\n${lines.join("\n")}`);
  }

  if (sources.articles && index.articles.length) {
    const lines = index.articles.map(
      (article) => `• ${article.title} — ${article.category} · /blog/${article.slug}`,
    );
    blocks.push(`ARTIGOS PUBLICADOS (${index.articles.length}):\n${lines.join("\n")}`);
  }

  if (sources.plans && index.plans.length) {
    const lines = index.plans.map(
      (plan) => `• ${plan.name} — R$ ${plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${plan.frequency})`,
    );
    blocks.push(`PLANOS ATIVOS (${index.plans.length}):\n${lines.join("\n")}`);
  }

  if (sources.pilulas && index.pilulas.length) {
    const lines = index.pilulas.map((pilula) => `• ${pilula.title} — ${pilula.category}`);
    blocks.push(`PÍLULAS DE CONHECIMENTO (${index.pilulas.length}):\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n");
}

/**
 * Inventário compacto de tudo que existe na plataforma.
 *
 * É o que separa "o agente sabe procurar" de "o agente sabe o que existe":
 * mesmo quando a busca não traz a aula certa, ele consegue dizer que o curso
 * existe, onde fica e o que ele cobre. Se o inventário completo não couber no
 * orçamento, ele degrada — aulas, depois módulos, depois só os cursos.
 */
export function buildPlatformMap(
  index: PlatformIndex,
  sources: AssistantKnowledgeSources,
  accessibleCourseIds: ReadonlySet<string> = new Set(),
  budget = PLATFORM_MAP_BUDGET,
): AssistantContextSource | null {
  for (const detail of ["lessons", "modules", "courses"] as MapDetail[]) {
    const content = renderMap(index, sources, accessibleCourseIds, detail);
    if (!content) return null;
    if (content.length <= budget || detail === "courses") {
      return {
        id: "platform-map",
        kind: "map",
        title: "Mapa da plataforma",
        content: content.slice(0, budget),
      };
    }
  }
  return null;
}

export type KnowledgeCandidate = AssistantContextSource & {
  order: number;
  /** Preenchido só em aulas e artigos, que ganham corpo completo na hidratação. */
  hydrate?: { kind: "lesson"; lessonId: string; courseId: string } | { kind: "article"; slug: string };
};

function lessonCandidate(course: IndexCourse, lesson: IndexLesson, order: number): KnowledgeCandidate {
  const location = course.isGallery || !lesson.moduleTitle
    ? course.title
    : `${course.title} · ${lesson.moduleTitle}`;
  return {
    id: lesson.id,
    kind: "lesson",
    title: `Aula — ${lesson.title} (${location})`,
    keywords: [lesson.topics.join(", "), lesson.solves.join(", "), lesson.objective, lesson.moduleTitle, course.title, course.category]
      .filter(Boolean)
      .join(" | "),
    content: [
      `Curso: ${course.title}`,
      lesson.moduleTitle && !course.isGallery ? `Módulo: ${lesson.moduleTitle}` : undefined,
      `Aula: ${lesson.title}`,
      `Link: ${lessonHref(course, lesson)}`,
      lesson.durationInMinutes ? `Duração: ${lesson.durationInMinutes} min` : undefined,
      lesson.level ? `Nível: ${lesson.level}` : undefined,
      lesson.shortDescription,
      lesson.objective ? `Objetivo: ${lesson.objective}` : undefined,
      lesson.topics.length ? `Tópicos: ${lesson.topics.join(", ")}` : undefined,
      lesson.solves.length ? `Resolve: ${lesson.solves.join(", ")}` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
    order,
    hydrate: { kind: "lesson", lessonId: lesson.id, courseId: course.id },
  };
}

function courseCandidate(course: IndexCourse, order: number): KnowledgeCandidate {
  const lessons = courseLessons(course);
  return {
    id: course.id,
    kind: "course",
    title: `Curso — ${course.title}`,
    keywords: [course.category, course.level, course.modules.map((module) => module.title).join(", ")]
      .filter(Boolean)
      .join(" | "),
    content: [
      `Curso: ${course.title}`,
      `Link: ${courseHref(course)}`,
      `Categoria: ${course.category}`,
      `Nível: ${course.level}`,
      `Aulas: ${lessons.length}`,
      course.shortDescription,
      course.description,
      course.modules.length ? `Módulos: ${course.modules.map((module) => module.title).join("; ")}` : undefined,
      lessons.length ? `Aulas: ${lessons.map((lesson) => lesson.title).join("; ")}` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
    order,
  };
}

/**
 * Todas as fontes que o agente pode considerar, já filtradas pelos toggles.
 *
 * `excludeCourseId` tira o curso aberto da lista global: ele já entra pelo
 * contexto do curso, com muito mais profundidade, e repetido aqui só gastaria
 * orçamento.
 */
export function platformCandidates(
  index: PlatformIndex,
  sources: AssistantKnowledgeSources,
  excludeCourseId?: string,
): KnowledgeCandidate[] {
  const candidates: KnowledgeCandidate[] = [];
  let order = 0;

  if (sources.courses) {
    for (const course of index.courses) {
      if (course.id === excludeCourseId) continue;
      candidates.push(courseCandidate(course, order++));
      for (const courseModule of course.modules) {
        for (const lesson of courseModule.lessons) candidates.push(lessonCandidate(course, lesson, order++));
      }
    }
  }

  if (sources.articles) {
    for (const article of index.articles) {
      candidates.push({
        id: article.slug,
        kind: "article",
        title: `Artigo — ${article.title}`,
        keywords: article.category,
        content: [
          `Artigo: ${article.title}`,
          `Link: /blog/${article.slug}`,
          `Categoria: ${article.category}`,
          article.author ? `Autor: ${article.author}` : undefined,
          article.excerpt,
        ]
          .filter(Boolean)
          .join("\n"),
        order: order++,
        hydrate: { kind: "article", slug: article.slug },
      });
    }
  }

  if (sources.plans) {
    for (const plan of index.plans) {
      candidates.push({
        id: plan.id,
        kind: "plan",
        title: `Plano — ${plan.name}`,
        content: [
          plan.description,
          `Preço: R$ ${plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          `Frequência: ${plan.frequency}`,
          plan.features.length ? `Recursos: ${plan.features.join("; ")}` : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
        order: order++,
      });
    }
  }

  if (sources.pilulas) {
    for (const pilula of index.pilulas) {
      candidates.push({
        id: pilula.id,
        kind: "pilula",
        title: `Pílula — ${pilula.title}`,
        keywords: pilula.category,
        content: [
          `Categoria: ${pilula.category}`,
          `Formato: ${pilula.format}`,
          pilula.summary,
          pilula.challenge ? `Desafio: ${pilula.challenge}` : undefined,
          pilula.estimatedMinutes ? `Duração: ${pilula.estimatedMinutes} min` : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
        order: order++,
      });
    }
  }

  return candidates;
}

export type HydratedBody = {
  content?: string;
  transcription?: string;
};

/**
 * Escolhe as fontes globais mais relevantes para a pergunta.
 *
 * Separado do empacotamento porque o corpo das aulas só é buscado no banco
 * depois da escolha — ranquear duas vezes o catálogo inteiro seria o dobro do
 * trabalho para chegar na mesma lista.
 */
export function selectPlatformSources(input: {
  index: PlatformIndex;
  sources: AssistantKnowledgeSources;
  question: string;
  limit?: number;
  excludeCourseId?: string;
}): KnowledgeCandidate[] {
  const candidates = platformCandidates(input.index, input.sources, input.excludeCourseId);
  const limit = input.limit ?? PLATFORM_SOURCE_LIMIT;
  return assistantQueryTerms(input.question).length
    ? rankSources(candidates, input.question, limit)
    : candidates.slice(0, limit);
}

/**
 * Monta o bloco global: manual, mapa e as fontes mais relevantes já hidratadas.
 *
 * O corpo completo só é anexado quando o admin liberou a fonte e o aluno tem
 * acesso ao curso — sem acesso, a aula entra apenas com ementa, que é o que a
 * página de vendas já mostra.
 */
export function buildPlatformKnowledgeContext(input: {
  index: PlatformIndex;
  sources: AssistantKnowledgeSources;
  manualKnowledge: string;
  selected: KnowledgeCandidate[];
  budget: number;
  accessibleCourseIds?: ReadonlySet<string>;
  bodies?: Map<string, HydratedBody>;
  includeMap?: boolean;
}): PackedAssistantContext {
  const accessible = input.accessibleCourseIds ?? new Set<string>();
  const bodies = input.bodies ?? new Map<string, HydratedBody>();
  const ordered: AssistantContextSource[] = [];

  if (input.sources.manual && input.manualKnowledge.trim()) {
    ordered.push({
      id: "manual",
      kind: "manual",
      title: "Base manual da plataforma",
      content: input.manualKnowledge.slice(0, Math.floor(input.budget / 3)),
    });
  }

  if (input.includeMap !== false) {
    const map = buildPlatformMap(input.index, input.sources, accessible, Math.min(PLATFORM_MAP_BUDGET, Math.floor(input.budget / 2)));
    if (map) ordered.push(map);
  }

  for (const candidate of input.selected) {
    const body = candidate.hydrate ? bodies.get(`${candidate.hydrate.kind}:${candidate.id}`) : undefined;
    const canReadBody =
      candidate.hydrate?.kind === "lesson"
        ? input.sources.lessons && accessible.has(candidate.hydrate.courseId)
        : candidate.hydrate?.kind === "article"
          ? input.sources.articles
          : false;

    const extra = canReadBody && body
      ? [
          body.content,
          input.sources.transcriptions && body.transcription ? `Transcrição:\n${body.transcription}` : undefined,
        ].filter(Boolean).join("\n\n")
      : "";

    const locked = candidate.hydrate?.kind === "lesson" && !accessible.has(candidate.hydrate.courseId)
      ? "\n[Aluno sem matrícula neste curso: use apenas a ementa acima e convide-o a conhecer o curso.]"
      : "";

    ordered.push({
      ...candidate,
      content: extra ? `${candidate.content}\n\n${extra}${locked}` : `${candidate.content}${locked}`,
    });
  }

  return packAssistantSources(ordered, input.budget, ASSISTANT_MAX_CHARS_PER_SOURCE);
}
