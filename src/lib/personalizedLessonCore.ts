import { createHash } from "node:crypto";
import type {
  PersonalizedLessonConfig,
  PersonalizedLessonQuestion,
  PersonalizedVariableBinding,
} from "@/types/personalizedLesson";
import {
  extractTemplateVariableKeys,
  formatUserVariableValues,
  interpolateUserPrompt,
  isValidUserVariableKey,
  normalizeUserVariableValue,
  USER_VARIABLE_KEY_PATTERN,
} from "@/lib/userVariables";

export const PERSONALIZED_LESSON_MAX_OUTPUT_TOKENS = 4_000;
export const PERSONALIZED_LESSON_CONTEXT_LIMIT = 120_000;
export const PERSONALIZED_LESSON_SOURCE_LIMIT = 14_000;

export type PersonalizedAnswerInput = Record<string, unknown>;
export { compileGuidedPrompt, createQuestionKey, DEFAULT_GUIDED_CONFIG, normalizeGuidedConfig } from "@/lib/personalizedLessonAuthoring";

export class PersonalizedLessonError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "personalized_lesson_invalid",
  ) {
    super(message);
    this.name = "PersonalizedLessonError";
  }
}

export function normalizeQuestions(value: unknown): PersonalizedLessonQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const type = row.type;
    if (!["short_text", "long_text", "single", "multiple"].includes(String(type))) return [];
    return [{
      id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
      key: String(row.key ?? "").trim().toLowerCase(),
      label: String(row.label ?? "").trim(),
      type: type as PersonalizedLessonQuestion["type"],
      required: Boolean(row.required),
      options: Array.isArray(row.options)
        ? row.options.map(normalizeUserVariableValue).filter(Boolean).slice(0, 50)
        : [],
      order: Number.isFinite(Number(row.order)) ? Number(row.order) : index,
    }];
  }).sort((a, b) => a.order - b.order);
}

export function normalizeBindings(value: unknown): PersonalizedVariableBinding[] {
  if (!Array.isArray(value)) return [];
  const allowedSources = new Set(["profile", "onboarding", "profile_test", "collected"]);
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const source = String(row.source ?? "");
    if (!allowedSources.has(source)) return [];
    const key = String(row.key ?? "").trim().toLowerCase();
    const sourceRef = String(row.sourceRef ?? "").trim();
    if (!USER_VARIABLE_KEY_PATTERN.test(key) || !sourceRef) return [];
    return [{
      key,
      label: String(row.label ?? key).trim() || key,
      source: source as PersonalizedVariableBinding["source"],
      sourceRef,
    }];
  });
}

export function validatePersonalizedLessonConfig(
  config: Pick<PersonalizedLessonConfig, "promptTemplate" | "context" | "model" | "questions" | "variableBindings">,
  options: { allowedModels?: ReadonlySet<string> } = {},
): string[] {
  const errors: string[] = [];
  const prompt = config.promptTemplate.trim();
  if (!prompt) errors.push("Escreva o prompt da aula.");
  if (prompt.length > 20_000) errors.push("O prompt deve ter no máximo 20 mil caracteres.");
  if (config.context.length > PERSONALIZED_LESSON_CONTEXT_LIMIT) {
    errors.push("O contexto deve ter no máximo 120 mil caracteres.");
  }
  if (!config.model.trim()) errors.push("Escolha o modelo de IA.");
  if (options.allowedModels && !options.allowedModels.has(config.model)) {
    errors.push("O modelo escolhido não está habilitado e precificado.");
  }

  const keys = new Set<string>();
  for (const question of config.questions) {
    if (!isValidUserVariableKey(question.key)) {
      errors.push(`A chave da pergunta “${question.label || "sem título"}” é inválida ou reservada.`);
    }
    if (keys.has(question.key)) errors.push(`A chave {{${question.key}}} está repetida.`);
    keys.add(question.key);
    if (!question.label.trim()) errors.push(`A pergunta {{${question.key || "sem_chave"}}} precisa de enunciado.`);
    if ((question.type === "single" || question.type === "multiple") && question.options.length < 2) {
      errors.push(`A pergunta “${question.label || question.key}” precisa de pelo menos duas opções.`);
    }
  }

  return [...new Set(errors)];
}

export function normalizeQuestionAnswers(
  questions: PersonalizedLessonQuestion[],
  input: PersonalizedAnswerInput,
): Record<string, string | string[]> {
  const answers: Record<string, string | string[]> = {};
  for (const question of questions) {
    const raw = input[question.key];
    const values = Array.isArray(raw)
      ? raw.map(normalizeUserVariableValue).filter(Boolean)
      : [normalizeUserVariableValue(raw)].filter(Boolean);
    if (question.required && values.length === 0) {
      throw new PersonalizedLessonError(`Responda à pergunta “${question.label}”.`, 422, "required_answer_missing");
    }
    if (values.some((item) => item.length > 4_000)) {
      throw new PersonalizedLessonError(`A resposta de “${question.label}” é muito longa.`, 422, "answer_too_long");
    }
    if ((question.type === "single" || question.type === "multiple")
      && values.some((item) => !question.options.includes(item))) {
      throw new PersonalizedLessonError(`A resposta de “${question.label}” não é uma opção válida.`, 422, "answer_invalid");
    }
    answers[question.key] = question.type === "multiple" ? values : (values[0] ?? "");
  }
  return answers;
}

export function answersAsVariables(answers: Record<string, string | string[]>): Record<string, string> {
  return Object.fromEntries(Object.entries(answers).map(([key, value]) => [
    key,
    Array.isArray(value) ? formatUserVariableValues(value) : normalizeUserVariableValue(value),
  ]));
}

/** Respostas feitas nesta aula têm precedência sobre qualquer valor reutilizado. */
export function mergePersonalizedVariables(
  reused: Record<string, string>,
  answers: Record<string, string | string[]>,
) {
  return { ...reused, ...answersAsVariables(answers) };
}

export function renderPersonalizedPrompt(template: string, variables: Record<string, string>) {
  const rendered = interpolateUserPrompt(template, variables);
  if (rendered.missingKeys.length === 0) {
    return rendered.value;
  }
  const filledVariables = { ...variables };
  for (const key of rendered.missingKeys) {
    filledVariables[key] = "(não informado)";
  }
  return interpolateUserPrompt(template, filledVariables).value;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stable(item)]));
  }
  return value;
}

export function createPersonalizedInputSignature(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

export function sanitizeExtractedText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/** Mantém Markdown/GFM, mas descarta HTML bruto antes da persistência. */
export function sanitizeGeneratedMarkdown(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\]\(\s*(?:javascript|vbscript|data):[^\n]*\)/gi, "](about:blank)")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}
