import { describe, expect, it } from "vitest";
import { getOverallProgress } from "./courses";
import { pickLatestTimestamp } from "./profiles";
import type { DB, Row } from "./types";

/**
 * Mock encadeável mínimo: `select`/`eq` devolvem o próprio builder e
 * `or`/`in` são terminais (resolvem a promise), que é a forma exata usada
 * por `getOverallProgress`.
 */
function mockDb(tables: Record<string, Row[]>): DB {
  return {
    from: (table: string) => {
      const rows = tables[table] ?? [];
      const result = Promise.resolve({ data: rows, error: null });
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        or: () => result,
        in: () => result,
      };
      return builder;
    },
  } as unknown as DB;
}

describe("getOverallProgress", () => {
  it("faz a média das porcentagens só sobre as matrículas ativas", async () => {
    const db = mockDb({
      enrollments: [{ course_id: "c1" }, { course_id: "c2" }],
      v_course_metrics: [
        { id: "c1", lesson_count: 10 },
        { id: "c2", lesson_count: 4 },
        { id: "c3", lesson_count: 20 }, // curso publicado sem matrícula: ignorado
      ],
      v_user_course_progress: [
        { course_id: "c1", completed_lessons: 5 }, // 50%
        { course_id: "c2", completed_lessons: 4 }, // 100%
      ],
    });

    const progress = await getOverallProgress(db, "user-1");

    expect(progress).toEqual({
      enrolledCourses: 2,
      completedCourses: 1,
      completedLessons: 9,
      totalLessons: 14,
      averagePercent: 75, // (50 + 100) / 2
    });
  });

  it("conta curso sem progresso como 0% em vez de descartar", async () => {
    const db = mockDb({
      enrollments: [{ course_id: "c1" }, { course_id: "c2" }],
      v_course_metrics: [
        { id: "c1", lesson_count: 8 },
        { id: "c2", lesson_count: 2 },
      ],
      v_user_course_progress: [{ course_id: "c1", completed_lessons: 8 }], // 100%, c2 sem linha
    });

    const progress = await getOverallProgress(db, "user-1");

    expect(progress.averagePercent).toBe(50); // (100 + 0) / 2
    expect(progress.completedCourses).toBe(1);
    expect(progress.completedLessons).toBe(8);
    expect(progress.totalLessons).toBe(10);
  });

  it("limita aulas concluídas ao total do curso (dados inconsistentes)", async () => {
    const db = mockDb({
      enrollments: [{ course_id: "c1" }],
      v_course_metrics: [{ id: "c1", lesson_count: 3 }],
      v_user_course_progress: [{ course_id: "c1", completed_lessons: 7 }],
    });

    const progress = await getOverallProgress(db, "user-1");

    expect(progress.averagePercent).toBe(100);
    expect(progress.completedLessons).toBe(3);
  });

  it("devolve zeros quando não há matrícula ativa", async () => {
    const db = mockDb({ enrollments: [] });

    const progress = await getOverallProgress(db, "user-1");

    expect(progress).toEqual({
      enrolledCourses: 0,
      completedCourses: 0,
      completedLessons: 0,
      totalLessons: 0,
      averagePercent: 0,
    });
  });
});

describe("pickLatestTimestamp", () => {
  it("escolhe o carimbo mais recente ignorando nulos e inválidos", () => {
    expect(
      pickLatestTimestamp(
        "2026-01-01T00:00:00Z",
        null,
        "2026-08-20T10:00:00Z",
        undefined,
        "not-a-date",
      ),
    ).toBe("2026-08-20T10:00:00Z");
  });

  it("devolve null quando não há nenhum valor utilizável", () => {
    expect(pickLatestTimestamp(null, undefined, "")).toBeNull();
  });
});
