import { describe, expect, it } from "vitest";
import {
  executeUnifiedSearch,
  extractSnippet,
  normalizeSearchText,
  scoreCandidate,
} from "./search";

describe("search utility functions", () => {
  it("normalizes text removing accents and converting to lowercase", () => {
    expect(normalizeSearchText("Comunicação & Liderança")).toBe("comunicacao & lideranca");
    expect(normalizeSearchText("PRÁTICA INTENCIONAL")).toBe("pratica intencional");
    expect(normalizeSearchText("")).toBe("");
  });

  it("extracts relevant snippets around query terms", () => {
    const text = "Este é um texto longo que discute feedback estruturado e como conduzir conversas difíceis no trabalho.";
    const snippet = extractSnippet(text, "feedback estruturado", 60);
    expect(snippet.toLowerCase()).toContain("feedback estruturado");
  });

  it("scores candidates higher when exact title matches", () => {
    const candidateA = {
      id: "1",
      type: "lesson" as const,
      title: "Comunicação assertiva",
      description: "Curso de liderança",
      category: "Comunicação",
      url: "/courses/1",
    };

    const candidateB = {
      id: "2",
      type: "lesson" as const,
      title: "Liderança e equipes",
      description: "Aprenda comunicação no time",
      category: "Liderança",
      url: "/courses/2",
    };

    const scoreA = scoreCandidate(candidateA, "comunicação", ["comunicacao"]);
    const scoreB = scoreCandidate(candidateB, "comunicação", ["comunicacao"]);

    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it("finds content across lessons, agents, blog articles, and user notes", () => {
    const localNotes = [
      {
        lessonId: "pessoal-123",
        lessonTitle: "Minha anotação sobre feedback",
        content: "Lembrar de sempre usar o método SBI nas reuniões semanais.",
        updatedAt: new Date().toISOString(),
        tags: ["carreira", "feedback"],
      },
    ];

    const result = executeUnifiedSearch({
      query: "feedback",
      type: "all",
      localNotes,
    });

    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.countsByType.agent).toBeGreaterThan(0); // Bea agent
    expect(result.countsByType.note).toBe(1); // User note
    expect(result.items.some((i) => i.type === "agent")).toBe(true);
    expect(result.items.some((i) => i.type === "note")).toBe(true);
  });

  it("filters correctly by tab type", () => {
    const localNotes = [
      {
        lessonId: "pessoal-456",
        lessonTitle: "Anotação de Comunicação",
        content: "Conteúdo pessoal",
        updatedAt: new Date().toISOString(),
      },
    ];

    const agentsOnly = executeUnifiedSearch({
      query: "comunicação",
      type: "agent",
      localNotes,
    });

    expect(agentsOnly.items.every((i) => i.type === "agent")).toBe(true);

    const notesOnly = executeUnifiedSearch({
      query: "comunicação",
      type: "note",
      localNotes,
    });

    expect(notesOnly.items.every((i) => i.type === "note")).toBe(true);
  });

  it("handles accent-insensitive searches properly", () => {
    const withAccents = executeUnifiedSearch({ query: "comunicação" });
    const withoutAccents = executeUnifiedSearch({ query: "comunicacao" });

    expect(withAccents.totalCount).toBe(withoutAccents.totalCount);
    expect(withAccents.items.length).toBeGreaterThan(0);
  });
});
