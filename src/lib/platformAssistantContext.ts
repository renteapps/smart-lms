import type { Course, Lesson, LessonContentBlock } from "@/types/course";
import type { AssistantMessage } from "@/types/platformAssistant";

export const ASSISTANT_MAX_MESSAGE_CHARS = 4_000;
export const ASSISTANT_HISTORY_BUDGET = 24_000;
export const ASSISTANT_CONTEXT_BUDGET = 120_000;
export const ASSISTANT_RATE_LIMIT_PER_MINUTE = 10;

/**
 * Teto por fonte quando o agente varre a plataforma inteira.
 *
 * Sem ele a primeira transcrição longa consome o orçamento sozinha e o agente
 * responde sabendo de uma aula só — exatamente o oposto do modo global.
 */
export const ASSISTANT_MAX_CHARS_PER_SOURCE = 14_000;

export type AssistantContextSource = {
  id: string;
  kind: "manual" | "article" | "course" | "lesson" | "plan" | "pilula" | "map";
  title: string;
  content: string;
  /**
   * Campos curtos e muito indicativos (tópicos, objetivo, módulo, categoria).
   * Pesam mais que o corpo no ranqueamento e menos que o título.
   */
  keywords?: string;
  /** Desempate estável quando a relevância empata — ordem editorial. */
  order?: number;
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

/*
 * Palavras que aparecem em quase toda pergunta em português.
 *
 * Sem essa lista, "como funciona o certificado do curso" pontuava todo o
 * catálogo por causa de "curso" e "como", e a aula que realmente fala de
 * certificado ficava atrás de qualquer ementa.
 */
const PT_STOPWORDS = new Set([
  "aula", "aulas", "como", "curso", "cursos", "dos", "das", "ele", "ela", "eles", "elas",
  "essa", "esse", "esta", "este", "isso", "mais", "meu", "minha", "nao", "para", "pelo",
  "pela", "por", "porque", "qual", "quais", "quando", "que", "quem", "sao", "seu", "sua",
  "sobre", "tem", "ter", "tudo", "uma", "uns", "umas", "voce", "vou", "com", "sem", "dentro",
  "onde", "posso", "pode", "poderia", "gostaria", "queria", "preciso", "ajuda", "favor",
  "plataforma", "conteudo", "informacao", "informacoes",
]);

function normalizeSearch(value: string): string {
  return stripMarkup(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Termos úteis da pergunta, sem acento, sem stopword e sem repetição.
 *
 * Quando a pergunta é só stopword ("como funciona?"), a lista volta com os
 * termos brutos — é melhor ranquear por algo do que devolver contexto vazio.
 */
export function assistantQueryTerms(query: string): string[] {
  const raw = Array.from(
    new Set(
      normalizeSearch(query)
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 3),
    ),
  );
  const meaningful = raw.filter((term) => !PT_STOPWORDS.has(term));
  return meaningful.length ? meaningful : raw;
}

function queryTerms(query: string): string[] {
  return assistantQueryTerms(query);
}

const searchableCache = new WeakMap<object, { title: string; keywords: string; content: string }>();

function searchableFields(source: RankableSource) {
  const cached = searchableCache.get(source);
  if (cached) return cached;
  const fields = {
    title: normalizeSearch(source.title),
    keywords: normalizeSearch(source.keywords ?? ""),
    content: normalizeSearch(source.content),
  };
  searchableCache.set(source, fields);
  return fields;
}

function countMatches(haystack: string, term: string): number {
  if (!haystack) return 0;
  const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g");
  return haystack.match(pattern)?.length ?? 0;
}

export type RankableSource = Pick<AssistantContextSource, "title" | "content"> &
  Partial<Pick<AssistantContextSource, "keywords" | "order">>;

/**
 * Raridade do termo no conjunto de candidatos.
 *
 * Um termo presente em quase todas as fontes não distingue nada; um termo que
 * aparece em duas aulas aponta direto para elas. É o que faz "reembolso" valer
 * mais que "gestão" num catálogo inteiro de gestão.
 */
export function buildInverseFrequency(sources: RankableSource[], terms: string[]): Map<string, number> {
  const total = sources.length || 1;
  const idf = new Map<string, number>();
  for (const term of terms) {
    let documents = 0;
    for (const source of sources) {
      const fields = searchableFields(source);
      if (countMatches(fields.title, term) || countMatches(fields.keywords, term) || countMatches(fields.content, term)) {
        documents += 1;
      }
    }
    idf.set(term, Math.log(1 + total / (1 + documents)) + 0.25);
  }
  return idf;
}

/**
 * Pontuação de relevância com peso por campo, raridade e cobertura.
 *
 * A cobertura é o fator decisivo: uma fonte que responde a três dos três
 * termos da pergunta ganha de outra que repete um termo trinta vezes.
 */
export function scoreSource(
  source: RankableSource,
  terms: string[],
  idf?: Map<string, number>,
  normalizedQuery?: string,
): number {
  if (!terms.length) return 0;
  const fields = searchableFields(source);
  let score = 0;
  let covered = 0;

  for (const term of terms) {
    const weight = idf?.get(term) ?? 1;
    const inTitle = countMatches(fields.title, term);
    const inKeywords = countMatches(fields.keywords, term);
    const inContent = countMatches(fields.content, term);
    const termScore = inTitle * 10 + inKeywords * 5 + Math.min(inContent, 8);
    if (termScore > 0) covered += 1;
    score += termScore * weight;
  }

  const coverage = covered / terms.length;
  const phrase = normalizedQuery && normalizedQuery.length >= 8
    ? (fields.title.includes(normalizedQuery) ? 30 : 0) + (fields.content.includes(normalizedQuery) ? 12 : 0)
    : 0;
  return score * (0.35 + 0.65 * coverage) + phrase;
}

/** Ordena por relevância e devolve os `limit` melhores, com desempate editorial. */
export function rankSources<T extends RankableSource>(sources: T[], question: string, limit: number): T[] {
  const terms = assistantQueryTerms(question);
  const idf = buildInverseFrequency(sources, terms);
  const normalizedQuery = normalizeSearch(question);
  return sources
    .map((source, index) => ({
      source,
      index,
      score: scoreSource(source, terms, idf, normalizedQuery),
    }))
    .sort((a, b) => b.score - a.score || (a.source.order ?? a.index) - (b.source.order ?? b.index))
    .slice(0, Math.max(0, limit))
    .map((item) => item.source);
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
  maxPerSource = Number.POSITIVE_INFINITY,
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
    const selected = clean.slice(0, Math.min(remaining - heading.length, maxPerSource));
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

/** Une blocos já empacotados preservando a ordem e sem duplicar fontes. */
export function mergeAssistantContexts(...blocks: PackedAssistantContext[]): PackedAssistantContext {
  const seen = new Set<string>();
  const texts: string[] = [];
  const sources: PackedAssistantContext["sources"] = [];
  for (const block of blocks) {
    if (block.text.trim()) texts.push(block.text);
    for (const source of block.sources) {
      const key = `${source.kind}:${source.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(source);
    }
  }
  return { text: texts.join("\n\n"), sources };
}

export type CourseContextOptions = {
  /** Desligado, o agente conhece o título e a ementa da aula mas não lê o corpo. */
  includeLessonBody?: boolean;
  includeTranscriptions?: boolean;
};

function lessonSource(lesson: Lesson, moduleTitle: string, options: CourseContextOptions = {}): AssistantContextSource {
  const withBody = options.includeLessonBody !== false;
  const withTranscription = options.includeTranscriptions !== false;
  const parts = [
    `Módulo: ${moduleTitle}`,
    `Aula: ${lesson.title}`,
    lesson.shortDescription,
    lesson.objective ? `Objetivo: ${lesson.objective}` : undefined,
    lesson.topics?.length ? `Tópicos: ${lesson.topics.join(", ")}` : undefined,
    withBody ? lesson.content : undefined,
    withBody ? extractBlocksText(lesson.blocks) : undefined,
    withBody && withTranscription && lesson.transcription ? `Transcrição:\n${lesson.transcription}` : undefined,
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
  options: CourseContextOptions = {},
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
        source: lessonSource(lesson, module.title, options),
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
