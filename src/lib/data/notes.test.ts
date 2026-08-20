import { describe, expect, it } from "vitest";
import {
  getLessonNote,
  getNotes,
  isAgentNote,
  isLessonNote,
  isPersonalNote,
  exportNotesAsMarkdown,
  type StudentNote,
} from "./notes";
import type { DB, Row } from "./types";

function createFakeDb(rows: Row[]): DB {
  return {
    from: (_table: string) => {
      const builder = {
        select: (_cols?: string) => builder,
        eq: (_col: string, _val: unknown) => builder,
        order: (_col: string, _opts?: unknown) => builder,
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (resolve: (val: { data: Row[]; error: null }) => unknown) =>
          resolve({ data: rows, error: null }),
      };
      return builder;
    },
  } as unknown as DB;
}

describe("notes data layer", () => {
  it("mapeia anotações de aula corretamente com courseId e lessonId", async () => {
    const fakeRows: Row[] = [
      {
        id: "note-123",
        kind: "lesson",
        lesson_id: "lesson-abc",
        lesson_title: "Introdução à Negociação",
        content: "Anotação sobre técnica SPIN",
        tags: ["vendas"],
        pinned: true,
        created_at: "2026-08-15T10:00:00Z",
        updated_at: "2026-08-15T12:00:00Z",
        lessons: {
          id: "lesson-abc",
          modules: {
            course_id: "course-xyz",
          },
        },
      },
    ];

    const db = createFakeDb(fakeRows);
    const notes = await getNotes(db, "user-1");

    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe("note-123");
    expect(notes[0].lessonId).toBe("lesson-abc");
    expect(notes[0].courseId).toBe("course-xyz");
    expect(notes[0].kind).toBe("lesson");
    expect(isLessonNote(notes[0])).toBe(true);
    expect(isAgentNote(notes[0])).toBe(false);
    expect(isPersonalNote(notes[0])).toBe(false);
  });

  it("mapeia anotação única de aula com getLessonNote", async () => {
    const fakeRows: Row[] = [
      {
        id: "note-123",
        kind: "lesson",
        lesson_id: "lesson-abc",
        lesson_title: "Introdução à Negociação",
        content: "Anotação sobre técnica SPIN",
        tags: ["vendas"],
        pinned: false,
        created_at: "2026-08-15T10:00:00Z",
        updated_at: "2026-08-15T12:00:00Z",
        lessons: [
          {
            id: "lesson-abc",
            modules: [
              {
                course_id: "course-xyz",
              },
            ],
          },
        ],
      },
    ];

    const db = createFakeDb(fakeRows);
    const note = await getLessonNote(db, "user-1", "lesson-abc");

    expect(note).not.toBeNull();
    expect(note?.courseId).toBe("course-xyz");
    expect(note?.lessonId).toBe("lesson-abc");
  });

  it("exporta notas para Markdown formatado", () => {
    const notes: StudentNote[] = [
      {
        id: "n1",
        kind: "lesson",
        lessonId: "l1",
        courseId: "c1",
        title: "Aula 1",
        content: "Conteúdo da aula 1",
        tags: ["tag1"],
        pinned: true,
        createdAt: "2026-08-15T10:00:00Z",
        updatedAt: "2026-08-15T12:00:00Z",
      },
    ];

    const md = exportNotesAsMarkdown(notes);
    expect(md).toContain("# Meu Caderno de Anotações");
    expect(md).toContain("## Aula 1");
    expect(md).toContain("Conteúdo da aula 1");
    expect(md).toContain("`#tag1`");
  });
});
