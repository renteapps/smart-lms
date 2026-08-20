import { describe, expect, it } from "vitest";
import { getContentIndex } from "./content";
import type { DB, Row } from "./types";

/**
 * Stub mínimo do query builder: só o encadeamento que `getContentIndex` usa
 * (`from().select().eq()` para artigos e `...eq().order()` para cursos).
 */
function fakeDb(courses: Row[], articles: Row[] = []): DB {
  const result = (data: Row[]) => ({
    data,
    error: null,
    order: () => Promise.resolve({ data, error: null }),
    then: (resolve: (value: { data: Row[]; error: null }) => unknown) => resolve({ data, error: null }),
  });

  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => result(table === "courses" ? courses : articles),
      }),
    }),
  } as unknown as DB;
}

function courseWith(lessons: Row[]): Row[] {
  return [{
    id: "c1",
    slug: "curso",
    title: "Curso",
    cover_url: null,
    modules: [{ id: "m1", title: "Módulo 1", order_index: 0, cover_url: null, lessons }],
  }];
}

const baseLesson = { is_published: true, is_eligible_for_trail: true, duration_in_minutes: 10 };

describe("getContentIndex — pré-requisitos", () => {
  it("usa a aula anterior do curso quando o admin não declara nada", async () => {
    const index = await getContentIndex(fakeDb(courseWith([
      { ...baseLesson, id: "l1", title: "Aula 1", order_index: 0 },
      { ...baseLesson, id: "l2", title: "Aula 2", order_index: 1 },
    ])));

    expect(index.byId("l1")?.prerequisites).toBeUndefined();
    expect(index.byId("l2")?.prerequisites).toEqual(["l1"]);
  });

  it("deixa o pré-requisito declarado substituir a corrente linear", async () => {
    const index = await getContentIndex(fakeDb(courseWith([
      { ...baseLesson, id: "l1", title: "Aula 1", order_index: 0 },
      { ...baseLesson, id: "l2", title: "Aula 2", order_index: 1 },
      { ...baseLesson, id: "l3", title: "Aula 3", order_index: 2, prerequisites: ["l1"] },
    ])));

    // Sem substituir, l3 herdaria l2 e a trilha não-linear seria impossível.
    expect(index.byId("l3")?.prerequisites).toEqual(["l1"]);
  });

  it("descarta id órfão e autorreferência em vez de propagar pré-requisito inválido", async () => {
    const index = await getContentIndex(fakeDb(courseWith([
      { ...baseLesson, id: "l1", title: "Aula 1", order_index: 0 },
      { ...baseLesson, id: "l2", title: "Aula 2", order_index: 1, prerequisites: ["nao-existe", "l2"] },
    ])));

    // Nada declarado sobrou de válido: volta para o padrão linear.
    expect(index.byId("l2")?.prerequisites).toEqual(["l1"]);
  });

  it("propaga o mesmo pré-requisito para a aula elegível do motor de afinidade", async () => {
    const index = await getContentIndex(fakeDb(courseWith([
      { ...baseLesson, id: "l1", title: "Aula 1", order_index: 0 },
      { ...baseLesson, id: "l2", title: "Aula 2", order_index: 1 },
      { ...baseLesson, id: "l3", title: "Aula 3", order_index: 2, prerequisites: ["l1"] },
    ])));

    expect(index.eligibleLessons.find((l) => l.lessonId === "l3")?.prerequisitos).toEqual(["l1"]);
  });
});
