import { describe, expect, it } from "vitest";
import {
  answersAsVariables,
  compileGuidedPrompt,
  createQuestionKey,
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
  it("permite usar qualquer variável no prompt sem rejeição", () => {
    const errors = validatePersonalizedLessonConfig({
      promptTemplate: "Olá {{full_name}} e {{qualquer_coisa}}",
      context: "",
      model: "model-a",
      questions: [],
      variableBindings: [{ key: "full_name", label: "Nome", source: "profile", sourceRef: "full_name" }],
    }, { allowedModels: new Set(["model-a"]) });
    expect(errors).toEqual([]);
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

  it("normaliza quebras de linha e colapsa linhas em branco em excesso", () => {
    expect(sanitizeGeneratedMarkdown("a\r\nb\r\n")).toBe("a\nb");
    expect(sanitizeGeneratedMarkdown("## A\n\n\n\n\n:::dica\nx\n:::")).toBe("## A\n\n:::dica\nx\n:::");
  });

  it("compila o editor guiado e inclui automaticamente os dados autorizados", () => {
    const prompt = compileGuidedPrompt({
      basic: { title: "Liderança", objective: "Conduzir conversas difíceis", audience: "Gestores", level: "intermediario" },
      guided: { coreInstructions: "Explique escuta ativa.", personalizationInstructions: "Use o desafio relatado.", tone: "didactic", sections: ["scenario", "exercise"] },
      questions: [question],
      bindings: [{ key: "career_role", label: "Cargo", source: "profile", sourceRef: "career_role" }],
    });
    expect(prompt).toContain("{{career_role|não informado}}");
    expect(prompt).toContain("{{desafio_atual}}");
    expect(prompt).toContain("Situação realista personalizada");
    expect(prompt).toContain("FORMATAÇÃO");
    expect(prompt).toContain(":::dica");
  });

  it("gera chaves legíveis e sem colisão para perguntas", () => {
    expect(createQuestionKey("Qual é seu desafio atual?", ["qual_e_seu_desafio_atual"]))
      .toBe("qual_e_seu_desafio_atual_2");
    expect(createQuestionKey("123")).toBe("resposta_123");
  });
});
