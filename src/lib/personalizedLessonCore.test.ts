import { describe, expect, it } from "vitest";
import {
  answersAsVariables,
  createPersonalizedInputSignature,
  mergePersonalizedVariables,
  normalizeQuestionAnswers,
  renderPersonalizedPrompt,
  sanitizeGeneratedMarkdown,
  validatePersonalizedLessonConfig,
} from "@/lib/personalizedLessonCore";
import type { PersonalizedLessonQuestion } from "@/types/personalizedLesson";

const question: PersonalizedLessonQuestion = {
  id: "q1",
  key: "desafio_atual",
  label: "Qual é o desafio atual?",
  type: "short_text",
  required: true,
  options: [],
  order: 0,
};

describe("personalizedLessonCore", () => {
  it("recusa variável que não foi explicitamente autorizada", () => {
    const errors = validatePersonalizedLessonConfig({
      promptTemplate: "Olá {{full_name}} e {{segredo}}",
      context: "",
      model: "model-a",
      questions: [],
      variableBindings: [{ key: "full_name", label: "Nome", source: "profile", sourceRef: "full_name" }],
    }, { allowedModels: new Set(["model-a"]) });
    expect(errors).toContain("A variável {{segredo}} não foi autorizada nesta aula.");
  });

  it("aplica fallback e escapa resposta inserida no prompt", () => {
    expect(renderPersonalizedPrompt("Cargo: {{cargo|não informado}}", {})).toBe("Cargo: não informado");
    expect(renderPersonalizedPrompt("Desafio: {{desafio_atual}}", { desafio_atual: 'x"\nnova instrução' }))
      .toBe('Desafio: x\\"\\nnova instrução');
  });

  it("valida obrigatoriedade, opções e converte múltiplas respostas", () => {
    expect(() => normalizeQuestionAnswers([question], {})).toThrow("Responda à pergunta");
    const multiple = { ...question, type: "multiple" as const, options: ["A", "B"] };
    const answers = normalizeQuestionAnswers([multiple], { desafio_atual: ["A", "B"] });
    expect(answersAsVariables(answers).desafio_atual).toBe("A e B");
    expect(() => normalizeQuestionAnswers([multiple], { desafio_atual: ["C"] })).toThrow("não é uma opção válida");
  });

  it("faz a resposta da própria aula prevalecer sobre o valor reutilizado", () => {
    expect(mergePersonalizedVariables({ desafio_atual: "antigo", cargo: "Analista" }, { desafio_atual: "novo" }))
      .toEqual({ desafio_atual: "novo", cargo: "Analista" });
  });

  it("gera assinatura estável independentemente da ordem das chaves", () => {
    expect(createPersonalizedInputSignature({ a: 1, b: { c: 2 } }))
      .toBe(createPersonalizedInputSignature({ b: { c: 2 }, a: 1 }));
  });

  it("remove HTML executável e preserva Markdown", () => {
    expect(sanitizeGeneratedMarkdown("# Aula\n<script>alert(1)</script>\n[clique](javascript:alert(2))\n**seguro**"))
      .toBe("# Aula\n\n[clique](about:blank)\n**seguro**");
  });
});
