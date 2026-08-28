/**
 * Geração de perguntas de quiz por IA — a parte que não fala com a rede.
 *
 * Aqui mora o que precisa ser confiável e testável: montar o prompt a partir do
 * material das aulas e, principalmente, transformar o texto que o modelo
 * devolve num `QuizQuestion` que o editor e o `gradeQuestion` aceitem. A
 * resposta de um LLM é só texto — nada garante o formato —, então tudo que
 * chega aqui é tratado como desconhecido e ou é consertado ou é descartado.
 */

import type { LessonContentBlock } from "@/types/course";
import type {
  FillBlankDef,
  MatchingPair,
  QuestionType,
  QuizOption,
  QuizQuestion,
  TableColumn,
} from "@/types/quiz";

export const QUESTION_TYPES: readonly QuestionType[] = [
  "multiple_choice",
  "multiple_select",
  "true_false",
  "open_ended",
  "matching",
  "fill_table",
  "fill_blank",
] as const;

/** Rótulos PT-BR dos tipos — fonte única do builder e do modal de criação. */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Múltipla Escolha",
  multiple_select: "Seleção Múltipla",
  true_false: "Verdadeiro ou Falso",
  open_ended: "Resposta Aberta (Dissertativa)",
  matching: "Relação (Associação)",
  fill_table: "Preencher Tabela",
  fill_blank: "Preencher Lacunas",
};

export const MAX_AI_QUESTIONS = 10;
export const MAX_AI_LESSONS = 10;
export const MAX_AI_EXTRA_PROMPT = 1000;
/** Mesmo teto de material usado em `generateLessonMetadataFromTranscription`. */
export const MAX_SOURCE_CHARS = 60_000;

export function isQuestionType(value: unknown): value is QuestionType {
  return typeof value === "string" && (QUESTION_TYPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Material de origem das aulas
// ---------------------------------------------------------------------------

export type AiSourceKind = "transcription" | "content" | "shortDescription";

export interface AiLessonSource {
  id: string;
  title: string;
  transcription?: string | null;
  shortDescription?: string | null;
  content?: string | null;
  blocks?: LessonContentBlock[] | null;
}

/** Texto corrido de uma árvore de blocos do BlockNote. */
export function blocksToPlainText(blocks: unknown): string {
  const out: string[] = [];

  const walkInline = (node: unknown): void => {
    if (typeof node === "string") {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walkInline);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record.text === "string") out.push(record.text);
    if (record.content) walkInline(record.content);
  };

  const walkBlock = (block: unknown): void => {
    if (!block || typeof block !== "object") return;
    const record = block as Record<string, unknown>;
    const before = out.length;
    walkInline(record.content);
    if (out.length > before) out.push("\n");
    if (Array.isArray(record.children)) record.children.forEach(walkBlock);
  };

  if (Array.isArray(blocks)) blocks.forEach(walkBlock);

  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Tira os prefixos `[HH:MM:SS]` que o import de legenda do PandaVideo grava em
 * `lessons.transcription` (ver `parseVttToText`). Eles não ajudam a IA a
 * escrever pergunta nenhuma e consomem uma fatia relevante do orçamento.
 */
export function stripTranscriptTimestamps(text: string): string {
  return text
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\]\s*/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Quais fontes de material a aula oferece, da mais rica para a mais pobre. */
export function lessonSourceKinds(lesson: AiLessonSource): AiSourceKind[] {
  const kinds: AiSourceKind[] = [];
  if (lesson.transcription?.trim()) kinds.push("transcription");
  if (lesson.content?.trim() || blocksToPlainText(lesson.blocks)) kinds.push("content");
  if (lesson.shortDescription?.trim()) kinds.push("shortDescription");
  return kinds;
}

export function isLessonEligibleForAi(lesson: AiLessonSource): boolean {
  return lessonSourceKinds(lesson).length > 0;
}

/** Todo o material aproveitável da aula, da fonte mais rica para a mais pobre. */
export function lessonSourceToText(lesson: AiLessonSource): string {
  const parts: string[] = [];

  const transcription = lesson.transcription?.trim();
  if (transcription) parts.push(stripTranscriptTimestamps(transcription));

  const blockText = blocksToPlainText(lesson.blocks);
  const content = blockText || lesson.content?.trim() || "";
  if (content) parts.push(content);

  const shortDescription = lesson.shortDescription?.trim();
  if (shortDescription && parts.length === 0) parts.push(shortDescription);

  return parts.join("\n\n").trim();
}

/**
 * Divide `MAX_SOURCE_CHARS` entre as aulas. Aula curta não gasta a cota
 * inteira, e o que sobra é redistribuído para as longas — assim selecionar uma
 * aula de uma linha junto de uma transcrição grande não corta a transcrição
 * pela metade à toa.
 */
export function budgetSourceTexts(texts: string[], totalBudget = MAX_SOURCE_CHARS): string[] {
  const result = new Array<string>(texts.length).fill("");
  const pending = texts.map((text, index) => ({ index, text })).filter((item) => item.text.length > 0);

  let remaining = totalBudget;
  let open = pending.length;

  // Menores primeiro: quem cabe inteiro devolve a sobra para quem não cabe.
  for (const item of [...pending].sort((a, b) => a.text.length - b.text.length)) {
    const share = Math.floor(remaining / open);
    const take = Math.min(item.text.length, share);
    result[item.index] = item.text.slice(0, take);
    remaining -= take;
    open -= 1;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const TYPE_SPECS: Record<QuestionType, { schema: string; rules: string }> = {
  multiple_choice: {
    schema: `{
    "text": "Enunciado da pergunta",
    "options": [
      { "text": "Alternativa correta", "isCorrect": true },
      { "text": "Distrator plausível", "isCorrect": false },
      { "text": "Outro distrator", "isCorrect": false },
      { "text": "Mais um distrator", "isCorrect": false }
    ],
    "explanation": "Por que a correta está certa."
  }`,
    rules: `- Entre 3 e 5 alternativas, com EXATAMENTE UMA marcada com "isCorrect": true.
- Os distratores devem ser plausíveis e do mesmo tamanho da correta; nada de "todas as anteriores" nem de alternativa obviamente absurda.`,
  },
  multiple_select: {
    schema: `{
    "text": "Enunciado da pergunta",
    "options": [
      { "text": "Correta 1", "isCorrect": true },
      { "text": "Correta 2", "isCorrect": true },
      { "text": "Distrator", "isCorrect": false },
      { "text": "Outro distrator", "isCorrect": false }
    ],
    "explanation": "Por que essas são as corretas."
  }`,
    rules: `- No mínimo 4 alternativas, com PELO MENOS DUAS marcadas com "isCorrect": true, e nunca todas corretas.
- O enunciado deve deixar claro que há mais de uma resposta certa.`,
  },
  true_false: {
    schema: `{
    "text": "Afirmação a ser julgada",
    "answer": true,
    "explanation": "Por que a afirmação é verdadeira ou falsa."
  }`,
    rules: `- "text" é uma AFIRMAÇÃO, não uma pergunta.
- "answer" é um booleano JSON puro (true ou false), nunca texto.
- Evite afirmações ambíguas ou que dependam de interpretação.`,
  },
  open_ended: {
    schema: `{
    "text": "Pergunta dissertativa",
    "explanation": "Resposta esperada / rubrica de correção para o aluno ler depois."
  }`,
    rules: `- A pergunta deve exigir raciocínio ou aplicação, não uma palavra solta.
- Como a correção é manual, use "explanation" para descrever a resposta esperada.`,
  },
  matching: {
    schema: `{
    "text": "Associe cada item à sua definição",
    "pairs": [
      { "left": "Item A", "right": "Definição de A" },
      { "left": "Item B", "right": "Definição de B" },
      { "left": "Item C", "right": "Definição de C" }
    ],
    "explanation": "Comentário sobre as associações."
  }`,
    rules: `- Entre 3 e 6 pares.
- Cada "right" precisa ser ÚNICO e não pode servir para dois "left" diferentes — senão a correção fica ambígua.
- Mantenha os textos curtos (poucas palavras de cada lado).`,
  },
  fill_table: {
    schema: `{
    "text": "Instrução do que o aluno deve preencher",
    "columns": [{ "header": "Coluna 1" }, { "header": "Coluna 2" }],
    "minRows": 2,
    "explanation": "O que se espera que apareça na tabela."
  }`,
    rules: `- Entre 2 e 4 colunas, com cabeçalhos curtos.
- "minRows" é quantas linhas o aluno precisa preencher, entre 1 e 10.
- O aluno escreve livremente: a correção só verifica se ele preencheu o mínimo de linhas. Use "explanation" para dizer o que era esperado.`,
  },
  fill_blank: {
    schema: `{
    "text": "A capital do Brasil é {{1}} e fica no estado {{2}}.",
    "blanks": [
      { "acceptedAnswers": ["Brasília"] },
      { "acceptedAnswers": ["Distrito Federal", "DF"] }
    ],
    "explanation": "Comentário sobre as lacunas."
  }`,
    rules: `- "text" é a frase completa com marcadores {{1}}, {{2}}, ... NUMERADOS EM SEQUÊNCIA a partir de 1, na ordem em que aparecem.
- Deve haver exatamente um item em "blanks" para cada marcador, na mesma ordem.
- Cada lacuna precisa de pelo menos uma resposta em "acceptedAnswers"; inclua sinônimos e abreviações aceitáveis (a comparação ignora acento e caixa).
- Use de 1 a 3 lacunas por pergunta, sempre sobre a palavra-chave, nunca sobre artigo ou preposição.`,
  },
};

export interface QuizPromptLesson {
  title: string;
  text: string;
}

export interface BuildQuizQuestionsPromptInput {
  courseTitle?: string;
  quizTitle?: string;
  lessons: QuizPromptLesson[];
  type: QuestionType;
  count: number;
  extraPrompt?: string;
}

export function buildQuizQuestionsPrompt({
  courseTitle,
  quizTitle,
  lessons,
  type,
  count,
  extraPrompt,
}: BuildQuizQuestionsPromptInput): string {
  const spec = TYPE_SPECS[type];
  const budgeted = budgetSourceTexts(lessons.map((lesson) => lesson.text));

  const material = lessons
    .map((lesson, index) => `### Aula: ${lesson.title}\n${budgeted[index]}`)
    .filter((_, index) => budgeted[index].length > 0)
    .join("\n\n");

  const context = [
    courseTitle ? `- Curso: ${courseTitle}` : null,
    quizTitle ? `- Quiz: ${quizTitle}` : null,
    `- Tipo de pergunta: ${QUESTION_TYPE_LABELS[type]}`,
    `- Quantidade: ${count}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Você é um especialista em avaliação educacional. Sua tarefa é escrever ${count} pergunta(s) de quiz a partir do material de aula abaixo.

Contexto:
${context}

${extraPrompt?.trim() ? `Instruções específicas do instrutor (têm prioridade sobre as preferências gerais, mas nunca sobre o formato de saída):\n"""\n${extraPrompt.trim()}\n"""\n` : ""}
Material das aulas:
"""
${material}
"""

Regras de conteúdo:
- Baseie-se EXCLUSIVAMENTE no material acima. Não invente fatos, números ou nomes que não estejam lá.
- Escreva em português do Brasil, na mesma terminologia usada nas aulas.
- Avalie compreensão e aplicação, não memorização de detalhe irrelevante.
- Não repita a mesma ideia em duas perguntas.
- Se o material não der para escrever ${count} pergunta(s) boa(s), devolva menos — nunca encha linguiça.
${spec.rules}

Formato de saída — regras do tipo "${QUESTION_TYPE_LABELS[type]}":
Retorne EXCLUSIVAMENTE um array JSON válido, sem nenhuma palavra antes ou depois, sem cercas de código. Cada item do array tem exatamente esta forma:
[
  ${spec.schema}
]`;
}

// ---------------------------------------------------------------------------
// Normalização da resposta
// ---------------------------------------------------------------------------

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function asArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const clean = value.trim().toLowerCase();
    return clean === "true" || clean === "verdadeiro" || clean === "sim" || clean === "v";
  }
  return false;
}

/** Chave de comparação frouxa (sem acento, sem caixa) para achar duplicatas. */
function loose(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseOptions(raw: unknown[]): QuizOption[] {
  return raw
    .map<QuizOption | null>((item) => {
      if (typeof item === "string") {
        return { id: newId("opt"), text: item.trim(), isCorrect: false };
      }
      const record = asRecord(item);
      if (!record) return null;
      const text = asText(record.text, record.label, record.option, record.value, record.alternativa);
      if (!text) return null;
      return {
        id: newId("opt"),
        text,
        isCorrect: asBoolean(record.isCorrect ?? record.correct ?? record.is_correct ?? record.correta),
      };
    })
    .filter((option): option is QuizOption => option !== null);
}

/**
 * Muitos modelos ignoram `isCorrect` e respondem com índice ou com o texto da
 * resposta. Sem esta recuperação, a pergunta viria sem gabarito e seria
 * descartada mesmo estando boa.
 */
function applyCorrectFallbacks(options: QuizOption[], source: Record<string, unknown>): QuizOption[] {
  if (options.some((option) => option.isCorrect)) return options;

  const indexes = new Set<number>();
  for (const candidate of [source.correctIndex, source.correct_index, source.answerIndex, source.answer]) {
    if (typeof candidate === "number" && Number.isInteger(candidate)) indexes.add(candidate);
  }
  for (const candidate of asArray(source.correctIndexes, source.correct_indexes, source.answerIndexes)) {
    if (typeof candidate === "number" && Number.isInteger(candidate)) indexes.add(candidate);
  }

  if (indexes.size > 0) {
    // Modelos oscilam entre base 0 e base 1; só aceitamos a leitura que couber.
    const zeroBased = [...indexes].every((index) => index >= 0 && index < options.length);
    const oneBased = !zeroBased && [...indexes].every((index) => index >= 1 && index <= options.length);
    if (zeroBased || oneBased) {
      const offset = zeroBased ? 0 : 1;
      return options.map((option, index) => ({ ...option, isCorrect: indexes.has(index + offset) }));
    }
  }

  const answerTexts = new Set(
    [
      ...asArray(source.correctAnswers, source.answers),
      source.correctAnswer,
      source.correct_answer,
      source.answer,
      source.resposta,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => loose(value)),
  );

  if (answerTexts.size > 0) {
    const matched = options.map((option) => ({ ...option, isCorrect: answerTexts.has(loose(option.text)) }));
    if (matched.some((option) => option.isCorrect)) return matched;
  }

  return options;
}

function normalizeTrueFalse(source: Record<string, unknown>): boolean | null {
  for (const key of ["answer", "correct", "isTrue", "correctAnswer", "resposta", "valor"]) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const clean = loose(value);
      if (["true", "verdadeiro", "v", "certo", "sim"].includes(clean)) return true;
      if (["false", "falso", "f", "errado", "nao"].includes(clean)) return false;
    }
  }

  const options = parseOptions(asArray(source.options, source.alternativas));
  const correct = options.find((option) => option.isCorrect);
  if (correct) {
    const clean = loose(correct.text);
    if (clean.startsWith("verdad") || clean === "true" || clean === "v") return true;
    if (clean.startsWith("fals") || clean === "false" || clean === "f") return false;
  }

  return null;
}

function parsePairs(raw: unknown[]): MatchingPair[] {
  const seen = new Set<string>();
  const pairs: MatchingPair[] = [];

  for (const item of raw) {
    const record = asRecord(item);
    if (!record) continue;
    const left = asText(record.left, record.item, record.term, record.termo, record.a);
    const right = asText(record.right, record.match, record.definition, record.definicao, record.b);
    if (!left || !right) continue;
    // `right` duplicado tornaria a correção ambígua (o editor já avisa disso).
    const key = loose(right);
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ id: newId("pair"), left, right });
  }

  return pairs;
}

function parseColumns(raw: unknown[]): TableColumn[] {
  return raw
    .map((item) => {
      const header =
        typeof item === "string" ? item.trim() : asText(asRecord(item)?.header, asRecord(item)?.title, asRecord(item)?.name);
      return header ? { id: newId("col"), header } : null;
    })
    .filter((column): column is TableColumn => column !== null);
}

/**
 * Renumera os marcadores `{{n}}` para 1..N na ordem de aparição e converte
 * lacunas escritas como `___`. Modelos pulam número com frequência, e o editor
 * de lacunas casa marcador com `blanks` por posição.
 */
function normalizeBlankMarkers(text: string): { text: string; count: number } {
  let working = text;

  if (!/\{\{\s*\d+\s*\}\}/.test(working) && /_{3,}/.test(working)) {
    working = working.replace(/_{3,}/g, "{{0}}");
  }

  let count = 0;
  const renumbered = working.replace(/\{\{\s*\d+\s*\}\}/g, () => {
    count += 1;
    return `{{${count}}}`;
  });

  return { text: renumbered, count };
}

function parseBlanks(raw: unknown[], count: number): FillBlankDef[] | null {
  const blanks: FillBlankDef[] = [];

  for (let index = 0; index < count; index += 1) {
    const record = asRecord(raw[index]);
    const rawAnswers = record
      ? [
          ...asArray(record.acceptedAnswers, record.accepted_answers, record.answers, record.respostas),
          record.answer,
          record.text,
          record.resposta,
        ]
      : [];

    const acceptedAnswers: string[] = [];
    const seen = new Set<string>();
    for (const answer of rawAnswers) {
      if (typeof answer !== "string" || !answer.trim()) continue;
      const key = loose(answer);
      if (seen.has(key)) continue;
      seen.add(key);
      acceptedAnswers.push(answer.trim());
    }

    const rawOptions = record ? parseOptions(asArray(record.options)) : [];
    const options = record ? applyCorrectFallbacks(rawOptions, record) : [];
    const correctOptions = options.filter((option) => option.isCorrect);

    if (options.length >= 2 && correctOptions.length === 1) {
      blanks.push({ id: newId("blank"), acceptedAnswers, options });
      continue;
    }

    if (acceptedAnswers.length === 0) return null;
    blanks.push({ id: newId("blank"), acceptedAnswers });
  }

  return blanks;
}

function normalizeQuestion(item: unknown, type: QuestionType): QuizQuestion | null {
  const source = asRecord(item);
  if (!source) return null;

  const text = asText(source.text, source.question, source.enunciado, source.statement, source.pergunta);
  if (!text) return null;

  const explanation = asText(source.explanation, source.feedback, source.explicacao, source.rationale);
  const base: QuizQuestion = { id: newId("q"), type, text };
  if (explanation) base.explanation = explanation;

  switch (type) {
    case "multiple_choice": {
      const options = applyCorrectFallbacks(
        parseOptions(asArray(source.options, source.alternativas, source.choices)),
        source,
      );
      if (options.length < 2) return null;
      const correct = options.filter((option) => option.isCorrect);
      if (correct.length === 0) return null;
      // Mais de uma correta em múltipla escolha é erro do modelo: fica a primeira.
      const [first] = correct;
      return { ...base, options: options.map((option) => ({ ...option, isCorrect: option.id === first.id })) };
    }

    case "multiple_select": {
      const options = applyCorrectFallbacks(
        parseOptions(asArray(source.options, source.alternativas, source.choices)),
        source,
      );
      const correct = options.filter((option) => option.isCorrect);
      if (options.length < 3 || correct.length < 2 || correct.length === options.length) return null;
      return { ...base, options };
    }

    case "true_false": {
      const answer = normalizeTrueFalse(source);
      if (answer === null) return null;
      return {
        ...base,
        options: [
          { id: newId("opt"), text: "Verdadeiro", isCorrect: answer },
          { id: newId("opt"), text: "Falso", isCorrect: !answer },
        ],
      };
    }

    case "matching": {
      const pairs = parsePairs(asArray(source.pairs, source.pares, source.matches, source.associations));
      if (pairs.length < 2) return null;
      return { ...base, pairs };
    }

    case "fill_table": {
      const columns = parseColumns(asArray(source.columns, source.colunas, source.headers));
      if (columns.length < 1) return null;
      const rawMinRows = Number(source.minRows ?? source.min_rows ?? source.linhas);
      const minRows = Number.isFinite(rawMinRows) ? Math.min(10, Math.max(1, Math.trunc(rawMinRows))) : 1;
      return {
        ...base,
        columns,
        minRows,
        // Com muitas colunas a tabela fica impossível de preencher no celular.
        tableLayout: columns.length > 3 || source.tableLayout === "stacked" ? "stacked" : "table",
      };
    }

    case "fill_blank": {
      const { text: template, count } = normalizeBlankMarkers(text);
      if (count < 1) return null;
      const blanks = parseBlanks(asArray(source.blanks, source.lacunas, source.gaps), count);
      if (!blanks) return null;
      return { ...base, text: template, blanks };
    }

    case "open_ended":
    default:
      return base;
  }
}

/**
 * Converte o que veio do modelo num array de `QuizQuestion` válidos. Aceita um
 * array puro, um objeto `{ questions: [...] }` ou uma pergunta solta; o que não
 * puder ser consertado é descartado em silêncio (quem chama trata o array
 * vazio).
 */
export function normalizeGeneratedQuestions(
  raw: unknown,
  type: QuestionType,
  count: number,
): QuizQuestion[] {
  let items: unknown[];

  if (Array.isArray(raw)) {
    items = raw;
  } else {
    const record = asRecord(raw);
    const nested = record ? asArray(record.questions, record.perguntas, record.items, record.data) : [];
    items = nested.length > 0 ? nested : record ? [record] : [];
  }

  const questions: QuizQuestion[] = [];
  for (const item of items) {
    if (questions.length >= count) break;
    const question = normalizeQuestion(item, type);
    if (question) questions.push(question);
  }

  return questions;
}
