import type { Course, Lesson, LessonContentBlock } from "@/types/course";
import type { AssistantMessage } from "@/types/platformAssistant";

export const ASSISTANT_MAX_MESSAGE_CHARS = 4_000;
export const ASSISTANT_HISTORY_BUDGET = 24_000;
export const ASSISTANT_CONTEXT_BUDGET = 120_000;
export const ASSISTANT_RATE_LIMIT_PER_MINUTE = 10;

export type AssistantContextSource = {
  id: string;
  kind: "manual" | "article" | "course" | "lesson" | "plan";
  title: string;
  content: string;
};

export type PackedAssistantContext = {
  text: string;
  sources: Array<{ id: string; kind: AssistantContextSource["kind"]; title: string; characters: number }>;
};

const IGNORED_BLOCK_KEYS = new Set([
  "id",
  "url",
  "src",
  "href",
  "color",
  "backgroundcolor",
  "textcolor",
  "classname",
  "style",
]);

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

/** Remove marcação executável e transforma HTML/MDX em texto apropriado para o contexto. */
export function stripMarkup(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/```[\w-]*\n?/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
      if (entity.startsWith("#")) {
        const codePoint = entity.startsWith("#x")
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : " ";
      }
      return HTML_ENTITIES[entity.toLowerCase()] ?? " ";
    })
    .replace(/^\s*[-*_#>]{1,6}\s*/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function blockValueToText(value: unknown, key = ""): string[] {
  if (value == null || typeof value === "boolean" || typeof value === "number") return [];
  if (typeof value === "string") return IGNORED_BLOCK_KEYS.has(key.toLowerCase()) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap((item) => blockValueToText(item, key));
  if (typeof value !== "object") return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([childKey, childValue]) =>
    IGNORED_BLOCK_KEYS.has(childKey.toLowerCase()) ? [] : blockValueToText(childValue, childKey),
  );
}

export function extractBlocksText(blocks: LessonContentBlock[] | undefined): string {
  return stripMarkup(blockValueToText(blocks ?? []).join("\n"));
}

function normalizeSearch(value: string): string {
  return stripMarkup(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function queryTerms(query: string): string[] {
  return Array.from(
    new Set(
      normalizeSearch(query)
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 3),
    ),
  );
}

export function lexicalScore(source: Pick<AssistantContextSource, "title" | "content">, query: string): number {
  const terms = queryTerms(query);
  if (!terms.length) return 0;
  const title = normalizeSearch(source.title);
  const content = normalizeSearch(source.content);
  return terms.reduce((score, term) => {
    const titleHit = title.includes(term) ? 8 : 0;
    const matches = content.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"));
    return score + titleHit + Math.min(matches?.length ?? 0, 6);
  }, 0);
}

export function packAssistantSources(
  sources: AssistantContextSource[],
  budget = ASSISTANT_CONTEXT_BUDGET,
): PackedAssistantContext {
  const chunks: string[] = [];
  const packedSources: PackedAssistantContext["sources"] = [];
  let remaining = Math.max(0, budget);

  for (const source of sources) {
    if (remaining <= 0) break;
    const clean = stripMarkup(source.content);
    if (!clean) continue;
    const heading = `[Fonte: ${source.title}]\n`;
    if (remaining <= heading.length) break;
    const selected = clean.slice(0, remaining - heading.length);
    const chunk = `${heading}${selected}`;
    chunks.push(chunk);
    packedSources.push({
      id: source.id,
      kind: source.kind,
      title: source.title,
      characters: selected.length,
    });
    remaining -= chunk.length + 2;
  }

  return { text: chunks.join("\n\n"), sources: packedSources };
}

function lessonSource(lesson: Lesson, moduleTitle: string): AssistantContextSource {
  const parts = [
    `Módulo: ${moduleTitle}`,
    `Aula: ${lesson.title}`,
    lesson.shortDescription,
    lesson.objective ? `Objetivo: ${lesson.objective}` : undefined,
    lesson.topics?.length ? `Tópicos: ${lesson.topics.join(", ")}` : undefined,
    lesson.content,
    extractBlocksText(lesson.blocks),
    lesson.transcription ? `Transcrição:\n${lesson.transcription}` : undefined,
  ];
  return {
    id: lesson.id,
    kind: "lesson",
    title: `${moduleTitle} — ${lesson.title}`,
    content: parts.filter(Boolean).join("\n\n"),
  };
}

/** Monta somente o curso recebido, ignora aulas não publicadas e preserva a prioridade editorial. */
export function buildCourseAssistantContext(
  course: Course,
  question: string,
  currentLessonId?: string,
  budget = ASSISTANT_CONTEXT_BUDGET,
): PackedAssistantContext {
  const overview: AssistantContextSource = {
    id: course.id,
    kind: "course",
    title: `Curso — ${course.title}`,
    content: [
      `Curso: ${course.title}`,
      course.shortDescription,
      course.description,
      `Categoria: ${course.category}`,
      `Nível: ${course.level}`,
      `Módulos: ${course.modules.map((module) => module.title).join("; ")}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const lessons = course.modules.flatMap((module, moduleIndex) =>
    module.lessons
      .filter((lesson) => lesson.isPublished !== false)
      .map((lesson, lessonIndex) => ({
        source: lessonSource(lesson, module.title),
        isCurrent: lesson.id === currentLessonId || lesson.slug === currentLessonId,
        editorialOrder: moduleIndex * 100_000 + lessonIndex,
      })),
  );
  const current = lessons.filter((item) => item.isCurrent);
  const related = lessons
    .filter((item) => !item.isCurrent)
    .sort((a, b) => {
      const relevance = lexicalScore(b.source, question) - lexicalScore(a.source, question);
      return relevance || a.editorialOrder - b.editorialOrder;
    });

  return packAssistantSources([...current.map((item) => item.source), overview, ...related.map((item) => item.source)], budget);
}

/** Base manual é sempre incluída; no máximo seis fontes automáticas entram por relevância. */
export function buildPlatformAssistantContext(
  manualKnowledge: string,
  automaticSources: AssistantContextSource[],
  question: string,
  budget = ASSISTANT_CONTEXT_BUDGET,
): PackedAssistantContext {
  const ranked = automaticSources
    .map((source, index) => ({ source, index, score: lexicalScore(source, question) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6)
    .map((item) => item.source);
  const manual: AssistantContextSource[] = stripMarkup(manualKnowledge)
    ? [{
        id: "manual",
        kind: "manual",
        title: "Base manual da plataforma",
        content: manualKnowledge.slice(0, Math.floor(budget / 2)),
      }]
    : [];
  return packAssistantSources([...manual, ...ranked], budget);
}

/** Seleciona o final da conversa sem cortar a mensagem mais recente. */
export function trimAssistantHistory(
  messages: AssistantMessage[],
  budget = ASSISTANT_HISTORY_BUDGET,
): AssistantMessage[] {
  const result: AssistantMessage[] = [];
  let used = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const cost = message.content.length + 24;
    if (result.length && used + cost > budget) break;
    result.unshift(
      !result.length && cost > budget
        ? { ...message, content: message.content.slice(-Math.max(0, budget - 24)) }
        : message,
    );
    used += Math.min(cost, budget);
  }
  return result;
}

export function conversationTitle(message: string): string {
  const clean = stripMarkup(message).replace(/\s+/g, " ").trim();
  return clean.length > 80 ? `${clean.slice(0, 77).trimEnd()}…` : clean || "Nova conversa";
}
