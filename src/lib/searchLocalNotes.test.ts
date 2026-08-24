import { describe, expect, it } from "vitest";
import type { StoredNote } from "@/lib/agentNotes";
import { localNoteToResult, matchesLocalNote, searchLocalNotes } from "@/lib/searchLocalNotes";

function note(overrides: Partial<StoredNote> = {}): StoredNote {
  return {
    lessonId: "aula-1",
    lessonTitle: "Feedback que funciona",
    content: "Comece pelo comportamento observável.",
    updatedAt: "2026-08-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("matchesLocalNote", () => {
  it("casa pelo título ignorando acento", () => {
    expect(matchesLocalNote(note({ lessonTitle: "Comunicação assertiva" }), "comunicacao")).toBe(true);
  });

  it("casa pelo conteúdo", () => {
    expect(matchesLocalNote(note(), "comportamento")).toBe(true);
  });

  it("casa por etiqueta", () => {
    expect(matchesLocalNote(note({ tags: ["liderança"] }), "lideranca")).toBe(true);
  });

  it("exige todos os termos, como a busca do banco", () => {
    expect(matchesLocalNote(note(), "feedback comportamento")).toBe(true);
    expect(matchesLocalNote(note(), "feedback orçamento")).toBe(false);
  });

  it("sem termo, tudo casa", () => {
    expect(matchesLocalNote(note(), "")).toBe(true);
  });
});

describe("localNoteToResult", () => {
  it("deduz o tipo de nota pelo prefixo do id", () => {
    expect(localNoteToResult(note({ lessonId: "agente-clara" })).metadata?.noteKind).toBe("agent");
    expect(localNoteToResult(note({ lessonId: "pessoal-abc" })).metadata?.noteKind).toBe("personal");
    expect(localNoteToResult(note({ lessonId: "aula-9" })).metadata?.noteKind).toBe("lesson");
  });

  it("marca a origem local e prefixa o id, para não colidir com o banco", () => {
    const result = localNoteToResult(note({ lessonId: "aula-9" }));
    expect(result.isLocal).toBe(true);
    expect(result.id).toBe("local:aula-9");
  });

  it("usa um título de reserva quando a nota não tem nome", () => {
    expect(localNoteToResult(note({ lessonTitle: "  " })).title).toBe("Anotação sem título");
  });
});

describe("searchLocalNotes", () => {
  const notes = [
    note({ lessonId: "a", lessonTitle: "Feedback difícil", updatedAt: "2026-08-01T00:00:00.000Z" }),
    note({ lessonId: "b", lessonTitle: "Feedback fixado", updatedAt: "2026-07-01T00:00:00.000Z", pinned: true }),
    note({
      lessonId: "c",
      lessonTitle: "Orçamento anual",
      content: "planilha",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }),
  ];

  it("filtra pelo termo", () => {
    expect(searchLocalNotes(notes, "feedback").map((item) => item.title)).toEqual([
      "Feedback fixado",
      "Feedback difícil",
    ]);
  });

  it("põe as fixadas na frente e depois as mais recentes", () => {
    const titles = searchLocalNotes(notes, "").map((item) => item.title);
    expect(titles[0]).toBe("Feedback fixado");
    expect(titles[1]).toBe("Feedback difícil");
  });

  it("pula notas que o banco já devolveu", () => {
    const result = searchLocalNotes(notes, "feedback", new Set(["b"]));
    expect(result.map((item) => item.title)).toEqual(["Feedback difícil"]);
  });

  it("ignora registro sem id", () => {
    expect(searchLocalNotes([note({ lessonId: "" })], "")).toEqual([]);
  });
});
