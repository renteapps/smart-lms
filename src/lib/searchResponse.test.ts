import { describe, expect, it } from "vitest";
import {
  parseCategories,
  parseCounts,
  parseItems,
  parseSearchResponse,
  parseSuggestions,
} from "@/lib/searchResponse";
import { EMPTY_COUNTS } from "@/types/search";

const itemValido = {
  id: "abc",
  type: "lesson",
  title: "Etapas da Negociação",
  url: "/courses/x/lessons/y",
  description: "Resumo",
  category: "Liderança",
  score: 0.42,
  hasAccess: false,
  snippet: "trecho com <b>marca</b>",
  metadata: { courseTitle: "Negociação", isCompleted: true },
};

describe("parseCounts", () => {
  it("zera o que não vier", () => {
    expect(parseCounts(undefined)).toEqual(EMPTY_COUNTS);
    expect(parseCounts({ all: 3 })).toEqual({ ...EMPTY_COUNTS, all: 3 });
  });

  it("ignora valor não numérico em vez de propagar NaN para a tela", () => {
    expect(parseCounts({ all: "muitos", lesson: 2 })).toEqual({
      ...EMPTY_COUNTS,
      lesson: 2,
    });
  });
});

describe("parseCategories", () => {
  it("descarta entrada sem rótulo", () => {
    expect(parseCategories([{ value: "Liderança", count: 5 }, { count: 9 }, null])).toEqual([
      { value: "Liderança", count: 5 },
    ]);
  });

  it("assume zero quando a contagem falta", () => {
    expect(parseCategories([{ value: "Geral" }])).toEqual([{ value: "Geral", count: 0 }]);
  });
});

describe("parseItems", () => {
  it("converte um item completo", () => {
    expect(parseItems([itemValido])).toEqual([
      {
        id: "abc",
        type: "lesson",
        title: "Etapas da Negociação",
        url: "/courses/x/lessons/y",
        description: "Resumo",
        category: "Liderança",
        score: 0.42,
        hasAccess: false,
        snippet: "trecho com <b>marca</b>",
        metadata: { courseTitle: "Negociação", isCompleted: true },
      },
    ]);
  });

  it("descarta só o item quebrado, preservando os demais", () => {
    const resultado = parseItems([
      itemValido,
      { ...itemValido, id: "sem-url", url: null },
      { ...itemValido, id: "sem-titulo", title: undefined },
      { ...itemValido, id: "tipo-desconhecido", type: "podcast" },
      "não é objeto",
    ]);
    expect(resultado.map((item) => item.id)).toEqual(["abc"]);
  });

  it("aceita ausência da lista", () => {
    expect(parseItems(null)).toEqual([]);
    expect(parseItems({})).toEqual([]);
  });
});

describe("parseSearchResponse", () => {
  it("cai na resposta vazia quando o payload não é objeto", () => {
    const resultado = parseSearchResponse("erro", "lideranca", 24);
    expect(resultado.query).toBe("lideranca");
    expect(resultado.items).toEqual([]);
    expect(resultado.page).toEqual({ size: 24, offset: 0, hasMore: false });
  });

  it("lê o payload completo", () => {
    const resultado = parseSearchResponse(
      {
        query: "negociacao",
        items: [itemValido],
        totalCount: 1,
        countsByType: { all: 1, lesson: 1 },
        categories: [{ value: "Liderança", count: 1 }],
        didYouMean: true,
        suggestedTerm: "  Negociação  ",
        page: { size: 24, offset: 0, hasMore: true },
      },
      "negociacao",
      24,
    );

    expect(resultado.totalCount).toBe(1);
    expect(resultado.didYouMean).toBe(true);
    expect(resultado.suggestedTerm).toBe("Negociação");
    expect(resultado.page.hasMore).toBe(true);
  });

  it("trata termo sugerido vazio como ausente, para o aviso não ficar sem palavra", () => {
    const base = { query: "x", items: [], totalCount: 0, didYouMean: true };
    expect(parseSearchResponse({ ...base, suggestedTerm: "   " }, "x", 24).suggestedTerm).toBeNull();
    expect(parseSearchResponse({ ...base, suggestedTerm: null }, "x", 24).suggestedTerm).toBeNull();
    expect(parseSearchResponse(base, "x", 24).suggestedTerm).toBeNull();
  });

  it("só aceita didYouMean estritamente booleano", () => {
    expect(parseSearchResponse({ didYouMean: "sim" }, "x", 24).didYouMean).toBe(false);
    expect(parseSearchResponse({ didYouMean: 1 }, "x", 24).didYouMean).toBe(false);
  });
});

describe("parseSuggestions", () => {
  it("descarta sugestão sem destino ou de tipo desconhecido", () => {
    const resultado = parseSuggestions([
      { title: "Negociação", url: "/courses/n", type: "course", category: "Liderança" },
      { title: "Sem url", type: "course" },
      { title: "Tipo estranho", url: "/x", type: "webinar" },
    ]);
    expect(resultado).toEqual([
      { title: "Negociação", url: "/courses/n", type: "course", category: "Liderança" },
    ]);
  });

  it("aceita payload ausente", () => {
    expect(parseSuggestions(undefined)).toEqual([]);
  });
});
