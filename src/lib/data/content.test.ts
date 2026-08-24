import { describe, expect, it } from "vitest";
import { getContentIndex } from "./content";
import type { DB, Row } from "./types";

/**
 * Stub mínimo do query builder: só o encadeamento que `getContentIndex` usa
 * (`from().select().eq()` para artigos e `...eq().order()` para cursos).
 */
function fakeDb(courses: Row[], articles: Row[] = []): DB {
  const queryBuilder = (data: Row[]) => {
    const obj = {
      data,
      error: null,
      eq: () => obj,
      neq: () => obj,
      lte: () => obj,
      order: () => Promise.resolve({ data, error: null }),
      then: (resolve: (value: { data: Row[]; error: null }) => unknown) => resolve({ data, error: null }),
    };
    return obj;
  };

  return {
    from: (table: string) => ({
      select: () => queryBuilder(table === "courses" ? courses : articles),
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

describe("getContentIndex — capa e origem da aula", () => {
  it("prefere a thumb da própria aula à capa do módulo e do curso", async () => {
    const index = await getContentIndex(fakeDb([{
      id: "c1",
      slug: "curso",
      title: "Curso",
      cover_url: "capa-do-curso.jpg",
      modules: [{
        id: "m1",
        title: "Módulo 1",
        order_index: 0,
        cover_url: "capa-do-modulo.jpg",
        lessons: [
          { ...baseLesson, id: "l1", title: "Aula 1", order_index: 0, cover_url: "thumb-da-aula.jpg" },
          { ...baseLesson, id: "l2", title: "Aula 2", order_index: 1, cover_url: "   " },
        ],
      }],
    }]));

    expect(index.byId("l1")?.cover).toBe("thumb-da-aula.jpg");
    // Sem thumb própria, a aula continua herdando a capa do módulo.
    expect(index.byId("l2")?.cover).toBe("capa-do-modulo.jpg");
  });

  it("não põe o módulo de infraestrutura do curso galeria como origem da aula", async () => {
    const index = await getContentIndex(fakeDb([{
      id: "c1",
      slug: "destaques",
      title: "Destaques",
      cover_url: "capa-do-curso.jpg",
      layout: "gallery",
      // O módulo único que a migration `gallery_courses` cria junto com o curso.
      modules: [{
        id: "m1",
        title: "Aulas",
        order_index: 0,
        cover_url: null,
        lessons: [{ ...baseLesson, id: "l1", title: "Masterclass", order_index: 0, cover_url: "thumb.jpg" }],
      }],
    }]));

    const lesson = index.byId("l1");
    expect(lesson?.cover).toBe("thumb.jpg");
    // Coleção de avulsas: sem sequência editorial e sem corrente de pré-requisitos.
    expect(lesson?.sequence).toBeUndefined();
    expect(lesson?.prerequisites).toBeUndefined();
    // "Módulo: Aulas" não diz nada: no curso galeria a origem é o próprio curso.
    expect(lesson?.moduleName).toBeUndefined();
    expect(lesson?.courseName).toBe("Destaques");
    expect(lesson?.category).toBe("Destaques");
  });
});

describe("getContentIndex — curso galeria não herda a corrente linear", () => {
  const gallery = (lessons: Row[]): Row[] => [{
    id: "c1",
    slug: "destaques",
    title: "Destaques",
    cover_url: "capa-do-curso.jpg",
    layout: "gallery",
    modules: [{ id: "m1", title: "Aulas", order_index: 0, cover_url: null, lessons }],
  }];

  it("não prende uma masterclass à anterior", async () => {
    const index = await getContentIndex(fakeDb(gallery([
      { ...baseLesson, id: "l1", title: "Masterclass 1", order_index: 1 },
      { ...baseLesson, id: "l2", title: "Masterclass 2", order_index: 2 },
      { ...baseLesson, id: "l6", title: "Masterclass 6", order_index: 6 },
    ])));

    /*
     * A regressão que isto trava: com a corrente linear, mapear a sexta
     * masterclass numa resposta arrastava as cinco anteriores como
     * pré-requisito e jogava para o fim do plano a aula que o admin tinha
     * posto em primeiro lugar na curadoria.
     */
    expect(index.byId("l6")?.prerequisites).toBeUndefined();
    expect(index.byId("l2")?.prerequisites).toBeUndefined();
    expect(index.eligibleLessons.find((l) => l.lessonId === "l6")?.prerequisitos).toBeUndefined();
  });

  it("continua respeitando o pré-requisito que o admin declarou", async () => {
    const index = await getContentIndex(fakeDb(gallery([
      { ...baseLesson, id: "l1", title: "Masterclass 1", order_index: 1 },
      { ...baseLesson, id: "l2", title: "Masterclass 2", order_index: 2, prerequisites: ["l1"] },
    ])));

    expect(index.byId("l2")?.prerequisites).toEqual(["l1"]);
  });
});
