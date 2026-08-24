import { describe, expect, it } from "vitest";
import {
  dropRecentSearch,
  mergeRecentSearches,
  normalizeTerms,
  pushRecentSearch,
  recentSearchKey,
} from "@/lib/recentSearches";

describe("recentSearchKey", () => {
  it("agrupa as grafias do mesmo termo", () => {
    expect(recentSearchKey("Liderança")).toBe(recentSearchKey("lideranca"));
    expect(recentSearchKey("  NEGOCIAÇÃO ")).toBe(recentSearchKey("negociacao"));
  });
});

describe("normalizeTerms", () => {
  it("descarta o que não for texto útil", () => {
    expect(normalizeTerms(["ok", "", "   ", 42, null, undefined])).toEqual(["ok"]);
    expect(normalizeTerms("não é lista")).toEqual([]);
  });
});

describe("mergeRecentSearches", () => {
  it("põe o local antes do servidor — é o mais recente", () => {
    expect(mergeRecentSearches(["feedback"], ["liderança"])).toEqual(["feedback", "liderança"]);
  });

  it("não repete o mesmo termo com acentuação diferente", () => {
    expect(mergeRecentSearches(["lideranca"], ["Liderança"])).toEqual(["lideranca"]);
  });

  it("respeita a dispensa, venha de onde vier", () => {
    expect(mergeRecentSearches(["feedback"], ["Liderança"], ["lideranca"])).toEqual(["feedback"]);
  });

  it("corta no limite", () => {
    const muitos = ["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8"];
    expect(mergeRecentSearches(muitos, [], [], 6)).toHaveLength(6);
  });

  it("ignora entradas vazias", () => {
    expect(mergeRecentSearches(["  ", ""], ["ok"])).toEqual(["ok"]);
  });
});

describe("pushRecentSearch", () => {
  it("traz o termo para a frente sem duplicar", () => {
    expect(pushRecentSearch(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
  });

  it("trata acentuação diferente como o mesmo termo", () => {
    expect(pushRecentSearch(["lideranca"], "Liderança")).toEqual(["Liderança"]);
  });

  it("ignora termo vazio", () => {
    expect(pushRecentSearch(["a"], "   ")).toEqual(["a"]);
  });

  it("respeita o limite", () => {
    expect(pushRecentSearch(["a", "b", "c", "d", "e", "f"], "novo", 6)).toHaveLength(6);
  });
});

describe("dropRecentSearch", () => {
  it("remove independentemente do acento", () => {
    expect(dropRecentSearch(["Liderança", "feedback"], "lideranca")).toEqual(["feedback"]);
  });
});
