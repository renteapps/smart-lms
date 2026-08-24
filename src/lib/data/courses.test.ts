import { describe, expect, it, vi } from "vitest";
import { getHomeCarouselRows, getGalleryCourse, HOME_CAROUSEL_SIZE } from "./courses";
import type { DB, Row } from "./types";

type QueryBuilderMock = {
  select: () => QueryBuilderMock;
  eq: () => QueryBuilderMock;
  neq: () => QueryBuilderMock;
  in: (col: string, vals: unknown[]) => Promise<{ data: unknown; error: null }>;
  order: () => Promise<{ data: unknown; error: null }>;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
};

function createMockDb(params: {
  courses?: Row[];
  galleryPreviews?: Row[];
  profile?: Row | null;
  enrollments?: Row[];
  subscriptions?: Row[];
  lessonProgress?: Row[];
}): DB {
  const {
    courses = [],
    galleryPreviews = [],
    profile = null,
    enrollments = [],
    subscriptions = [],
    lessonProgress = [],
  } = params;

  return {
    from: vi.fn((table: string) => {
      if (table === "courses") {
        const query: QueryBuilderMock = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          in: () => Promise.resolve({ data: courses, error: null }),
          order: () => Promise.resolve({ data: courses, error: null }),
          maybeSingle: () => Promise.resolve({ data: courses[0] ?? null, error: null }),
        };
        return query;
      }

      if (table === "gallery_lesson_previews") {
        const query: QueryBuilderMock = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          in: () => Promise.resolve({ data: galleryPreviews, error: null }),
          order: () => Promise.resolve({ data: galleryPreviews, error: null }),
          maybeSingle: () => Promise.resolve({ data: galleryPreviews[0] ?? null, error: null }),
        };
        return query;
      }

      if (table === "profiles") {
        const query: QueryBuilderMock = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          in: () => Promise.resolve({ data: profile ? [profile] : [], error: null }),
          order: () => Promise.resolve({ data: profile ? [profile] : [], error: null }),
          maybeSingle: () => Promise.resolve({ data: profile, error: null }),
        };
        return query;
      }

      if (table === "enrollments") {
        const query: QueryBuilderMock = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          in: () => Promise.resolve({ data: enrollments, error: null }),
          order: () => Promise.resolve({ data: enrollments, error: null }),
          maybeSingle: () => Promise.resolve({ data: enrollments[0] ?? null, error: null }),
        };
        return query;
      }

      if (table === "subscriptions") {
        const query: QueryBuilderMock = {
          select: () => query,
          eq: () => Promise.resolve({ data: subscriptions, error: null }) as unknown as QueryBuilderMock,
          neq: () => query,
          in: () => Promise.resolve({ data: subscriptions, error: null }),
          order: () => Promise.resolve({ data: subscriptions, error: null }),
          maybeSingle: () => Promise.resolve({ data: subscriptions[0] ?? null, error: null }),
        };
        return query;
      }

      if (table === "lesson_progress") {
        const query: QueryBuilderMock = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          in: () => Promise.resolve({ data: lessonProgress, error: null }),
          order: () => Promise.resolve({ data: lessonProgress, error: null }),
          maybeSingle: () => Promise.resolve({ data: lessonProgress[0] ?? null, error: null }),
        };
        return query;
      }

      const defaultQuery: QueryBuilderMock = {
        select: () => defaultQuery,
        eq: () => defaultQuery,
        neq: () => defaultQuery,
        in: () => Promise.resolve({ data: [], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      };
      return defaultQuery;
    }),
  } as unknown as DB;
}

describe("getHomeCarouselRows — ordenação das aulas galeria", () => {
  it("ordena as aulas pelo order_index (definido em aulas-galeria) e não apenas pela data de criação", async () => {
    const courseId = "course-galeria-1";
    const courses: Row[] = [
      {
        id: courseId,
        slug: "curso-galeria",
        title: "Curso Galeria Teste",
        cover_url: "https://example.com/cover.jpg",
        order_index: 1,
        sales_url: null,
        sales_config: null,
        layout: "gallery",
        home_carousel: true,
        is_published: true,
        status: "Publicado",
      },
    ];

    // Aula 3 foi criada DEPOIS (data mais recente), mas tem order_index 1
    // Aula 1 foi criada PRIMEIRO, mas tem order_index 2
    // Aula 2 tem order_index 3
    const galleryPreviews: Row[] = [
      {
        id: "aula-1",
        course_id: courseId,
        title: "Aula Um (Posição 2)",
        cover_url: "https://example.com/thumb1.jpg",
        duration_in_minutes: 15,
        short_description: "Desc 1",
        slug: "aula-um",
        order_index: 2,
        created_at: "2026-01-01T10:00:00Z",
      },
      {
        id: "aula-2",
        course_id: courseId,
        title: "Aula Dois (Posição 3)",
        cover_url: "https://example.com/thumb2.jpg",
        duration_in_minutes: 20,
        short_description: "Desc 2",
        slug: "aula-dois",
        order_index: 3,
        created_at: "2026-01-02T10:00:00Z",
      },
      {
        id: "aula-3",
        course_id: courseId,
        title: "Aula Três (Posição 1)",
        cover_url: "https://example.com/thumb3.jpg",
        duration_in_minutes: 25,
        short_description: "Desc 3",
        slug: "aula-tres",
        order_index: 1,
        created_at: "2026-01-03T10:00:00Z",
      },
    ];

    const db = createMockDb({ courses, galleryPreviews });
    const rows = await getHomeCarouselRows(db, null);

    expect(rows).toHaveLength(1);
    expect(rows[0].courseId).toBe(courseId);
    expect(rows[0].lessons).toHaveLength(3);

    // Deve respeitar order_index: aula-3 (pos 1), aula-1 (pos 2), aula-2 (pos 3)
    expect(rows[0].lessons.map((l) => l.id)).toEqual(["aula-3", "aula-1", "aula-2"]);
    expect(rows[0].lessons.map((l) => l.title)).toEqual([
      "Aula Três (Posição 1)",
      "Aula Um (Posição 2)",
      "Aula Dois (Posição 3)",
    ]);
  });

  it("limita a lista de aulas ao tamanho máximo do carrossel (HOME_CAROUSEL_SIZE = 8) respeitando a ordem", async () => {
    const courseId = "course-galeria-2";
    const courses: Row[] = [
      {
        id: courseId,
        slug: "curso-galeria-10-aulas",
        title: "Curso Galeria 10 Aulas",
        cover_url: "https://example.com/cover.jpg",
        order_index: 1,
        sales_url: null,
        sales_config: null,
      },
    ];

    const galleryPreviews: Row[] = Array.from({ length: 12 }, (_, i) => ({
      id: `aula-${i + 1}`,
      course_id: courseId,
      title: `Aula ${i + 1}`,
      cover_url: null,
      duration_in_minutes: 10,
      short_description: null,
      slug: `aula-${i + 1}`,
      order_index: i + 1,
      created_at: new Date(2026, 0, i + 1).toISOString(),
    }));

    const db = createMockDb({ courses, galleryPreviews });
    const rows = await getHomeCarouselRows(db, null);

    expect(rows).toHaveLength(1);
    expect(rows[0].lessons).toHaveLength(HOME_CAROUSEL_SIZE);
    expect(rows[0].lessons.map((l) => l.id)).toEqual([
      "aula-1",
      "aula-2",
      "aula-3",
      "aula-4",
      "aula-5",
      "aula-6",
      "aula-7",
      "aula-8",
    ]);
  });
});

describe("getGalleryCourse — ordenação na página pública do curso galeria", () => {
  it("retorna as aulas ordenadas por order_index", async () => {
    const courseId = "course-galeria-page";
    const courses: Row[] = [
      {
        id: courseId,
        slug: "curso-galeria-page",
        title: "Curso Galeria Capa",
        cover_url: "https://example.com/cover.jpg",
        layout: "gallery",
        status: "Publicado",
        is_published: true,
      },
    ];

    const galleryPreviews: Row[] = [
      {
        id: "l2",
        course_id: courseId,
        title: "Segunda Aula",
        cover_url: null,
        duration_in_minutes: 10,
        slug: "segunda-aula",
        order_index: 2,
        created_at: "2026-01-02T10:00:00Z",
      },
      {
        id: "l1",
        course_id: courseId,
        title: "Primeira Aula",
        cover_url: null,
        duration_in_minutes: 10,
        slug: "primeira-aula",
        order_index: 1,
        created_at: "2026-01-01T10:00:00Z",
      },
    ];

    const db = createMockDb({ courses, galleryPreviews });
    const result = await getGalleryCourse(db, courseId, null);

    expect(result).not.toBeNull();
    expect(result?.lessons.map((l) => l.id)).toEqual(["l1", "l2"]);
  });
});
