import type {
  PersonalizedGuidedConfig,
  PersonalizedLessonBasicDraft,
  PersonalizedLessonQuestion,
  PersonalizedLessonSection,
  PersonalizedVariableBinding,
} from "@/types/personalizedLesson";
import { normalizeUserVariableValue } from "@/lib/userVariables";

export const DEFAULT_GUIDED_CONFIG: PersonalizedGuidedConfig = {
  coreInstructions: "",
  personalizationInstructions: "",
  tone: "didactic",
  sections: ["explanation", "scenario", "example", "exercise", "summary"],
};

export const GUIDED_SECTION_LABELS: Record<PersonalizedLessonSection, string> = {
  explanation: "Explicação clara dos conceitos essenciais",
  scenario: "Situação realista personalizada para o aluno",
  example: "Exemplo aplicado",
  exercise: "Exercício prático",
  action_plan: "Plano de ação",
  summary: "Resumo e próximos passos",
};

export const GUIDED_TONE_LABELS: Record<PersonalizedGuidedConfig["tone"], string> = {
  didactic: "Didático e próximo",
  direct: "Direto e prático",
  inspiring: "Inspirador",
  formal: "Formal e profissional",
};

export function normalizeGuidedConfig(value: unknown): PersonalizedGuidedConfig {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const tone = ["didactic", "direct", "inspiring", "formal"].includes(String(row.tone))
    ? row.tone as PersonalizedGuidedConfig["tone"]
    : DEFAULT_GUIDED_CONFIG.tone;
  const sections = Array.isArray(row.sections)
    ? row.sections.filter((item): item is PersonalizedLessonSection => typeof item === "string" && item in GUIDED_SECTION_LABELS)
    : DEFAULT_GUIDED_CONFIG.sections;
  return {
    coreInstructions: normalizeUserVariableValue(row.coreInstructions).slice(0, 12_000),
    personalizationInstructions: normalizeUserVariableValue(row.personalizationInstructions).slice(0, 4_000),
    tone,
    sections: [...new Set(sections)],
  };
}

export function createQuestionKey(label: string, usedKeys: Iterable<string> = []) {
  const normalized = label.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 56);
  const root = /^[a-z]/.test(normalized) ? normalized : `resposta_${normalized || "aluno"}`;
  const used = new Set([...usedKeys].map((key) => key.toLowerCase()));
  if (!used.has(root)) return root;
  let suffix = 2;
  while (used.has(`${root}_${suffix}`)) suffix += 1;
  return `${root}_${suffix}`;
}

export function compileGuidedPrompt(input: {
  basic: Pick<PersonalizedLessonBasicDraft, "title" | "objective" | "audience" | "level">;
  guided: PersonalizedGuidedConfig;
  questions: PersonalizedLessonQuestion[];
  bindings: PersonalizedVariableBinding[];
}) {
  const variableLines = [
    ...input.bindings.map((binding) => `- ${binding.label}: {{${binding.key}|não informado}}`),
    ...input.questions.map((question) => `- ${question.label}: {{${question.key}${question.required ? "" : "|não informado"}}}`),
  ];
  const structure = input.guided.sections.map((section) => `- ${GUIDED_SECTION_LABELS[section]}`).join("\n");
  return [
    `Crie uma aula personalizada chamada “${input.basic.title.trim()}”.`,
    `OBJETIVO PEDAGÓGICO:\n${input.basic.objective.trim()}`,
    input.basic.audience.trim() ? `PÚBLICO-ALVO:\n${input.basic.audience.trim()}` : "",
    `NÍVEL:\n${input.basic.level}`,
    `CONTEÚDO E SITUAÇÕES QUE DEVEM SER ABORDADOS:\n${input.guided.coreInstructions.trim()}`,
    input.guided.personalizationInstructions.trim()
      ? `COMO PERSONALIZAR:\n${input.guided.personalizationInstructions.trim()}`
      : "Adapte exemplos, contexto e linguagem aos dados autorizados disponíveis.",
    `TOM:\n${GUIDED_TONE_LABELS[input.guided.tone].toLowerCase()}`,
    structure ? `ESTRUTURA ESPERADA:\n${structure}` : "",
    variableLines.length
      ? `DADOS AUTORIZADOS DO ALUNO:\n${variableLines.join("\n")}`
      : "Não há dados individuais autorizados; não invente características do aluno.",
  ].filter(Boolean).join("\n\n");
}

