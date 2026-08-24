import { describe, expect, it } from "vitest";
import {
  extractTerms,
  foldForMatch,
  highlightTerms,
  parseSnippet,
  snippetToPlainText,
} from "@/lib/searchHighlight";

describe("foldForMatch", () => {
  it("remove acento e caixa", () => {
    expect(foldForMatch("Comunicação Assertiva")).toBe("comunicacao assertiva");
  });

  it("preserva o comprimento, que é o que mantém os índices alinhados", () => {
    for (const value of ["Comunicação", "ÀÉÎÕÜ", "liderança", "Ação e reação"]) {
      expect(foldForMatch(value)).toHaveLength(value.length);
    }
  });

  it("preserva o comprimento mesmo com o texto já decomposto", () => {
    const decomposed = "Comunicação".normalize("NFD");
    expect(foldForMatch(decomposed)).toHaveLength(decomposed.length);
  });
});

describe("extractTerms", () => {
  it("descarta termos de uma letra e pontuação", () => {
    expect(extractTerms("a comunicação, e o feedback!")).toEqual(
      expect.arrayContaining(["comunicacao", "feedback"]),
    );
    expect(extractTerms("a comunicação, e o feedback!")).not.toContain("a");
  });

  it("ordena do mais longo para o mais curto", () => {
    expect(extractTerms("lider lideranca")).toEqual(["lideranca", "lider"]);
  });

  it("devolve vazio para entrada ausente", () => {
    expect(extractTerms(undefined)).toEqual([]);
    expect(extractTerms("")).toEqual([]);
  });
});

describe("highlightTerms", () => {
  it("marca o trecho com o acento original quando o termo veio sem acento", () => {
    const segments = highlightTerms("Curso de Comunicação", "comunicacao");
    expect(segments).toEqual([
      { text: "Curso de ", marked: false },
      { text: "Comunicação", marked: true },
    ]);
  });

  it("marca todas as ocorrências", () => {
    const segments = highlightTerms("feedback sobre feedback", "feedback");
    expect(segments.filter((segment) => segment.marked)).toHaveLength(2);
  });

  it("funde marcações sobrepostas em vez de aninhar", () => {
    const segments = highlightTerms("lideranca", "lider lideranca");
    expect(segments).toEqual([{ text: "lideranca", marked: true }]);
  });

  it("devolve o texto inteiro sem marcação quando não há termo", () => {
    expect(highlightTerms("Qualquer coisa", "")).toEqual([
      { text: "Qualquer coisa", marked: false },
    ]);
  });

  it("nunca perde nem duplica caractere do texto original", () => {
    const text = "Prática deliberada e comunicação não-violenta";
    const rebuilt = highlightTerms(text, "pratica comunicacao")
      .map((segment) => segment.text)
      .join("");
    expect(rebuilt).toBe(text);
  });
});

describe("parseSnippet", () => {
  it("converte a marcação do ts_headline em segmentos", () => {
    expect(parseSnippet("dar <b>feedback</b> é uma habilidade")).toEqual([
      { text: "dar ", marked: false },
      { text: "feedback", marked: true },
      { text: " é uma habilidade", marked: false },
    ]);
  });

  it("trata texto sem marcação", () => {
    expect(parseSnippet("sem marcação")).toEqual([{ text: "sem marcação", marked: false }]);
  });

  it("não marca pela metade quando a abertura fica órfã", () => {
    // ts_headline truncado no meio da tag.
    expect(parseSnippet("texto <b>cortado")).toEqual([{ text: "texto <b>cortado", marked: false }]);
  });

  it("aceita ausência de trecho", () => {
    expect(parseSnippet(null)).toEqual([]);
    expect(parseSnippet(undefined)).toEqual([]);
    expect(parseSnippet("")).toEqual([]);
  });

  it("extrai o texto puro sem as marcas", () => {
    expect(snippetToPlainText("dar <b>feedback</b> hoje")).toBe("dar feedback hoje");
  });
});
