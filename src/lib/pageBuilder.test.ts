import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_DOCUMENTS,
  isSafePageUrl,
  selectPageItems,
  validatePageDocument,
} from "./pageBuilder";

describe("page builder document", () => {
  it("valida os dois modelos padrão", () => {
    expect(validatePageDocument(DEFAULT_PAGE_DOCUMENTS["public-home"], "public-home").success).toBe(true);
    expect(validatePageDocument(DEFAULT_PAGE_DOCUMENTS["no-products"], "no-products").success).toBe(true);
  });

  it("rejeita chave divergente, ids duplicados e protocolos perigosos", () => {
    expect(validatePageDocument(DEFAULT_PAGE_DOCUMENTS["public-home"], "no-products").success).toBe(false);

    const duplicate = structuredClone(DEFAULT_PAGE_DOCUMENTS["public-home"]);
    duplicate.sections[1].id = duplicate.sections[0].id;
    expect(validatePageDocument(duplicate).success).toBe(false);

    const unsafe = structuredClone(DEFAULT_PAGE_DOCUMENTS["public-home"]);
    const hero = unsafe.sections[0];
    if (hero.type === "hero") hero.ctas[0].href = "javascript:alert(1)";
    expect(validatePageDocument(unsafe).success).toBe(false);
    expect(isSafePageUrl("https://example.com")).toBe(true);
    expect(isSafePageUrl("/cursos")).toBe(true);
    expect(isSafePageUrl("//evil.test")).toBe(false);
  });

  it("mantém a ordem manual e ignora referências removidas", () => {
    const items = [
      { id: "a", featured: false, category: "Um" },
      { id: "b", featured: true, category: "Dois" },
      { id: "c", featured: true, category: "Dois" },
    ];
    expect(selectPageItems(items, {
      mode: "manual", itemIds: ["c", "removido", "a"], rule: "all", limit: 10,
    }, { id: (item) => item.id })).toEqual([items[2], items[0]]);
    expect(selectPageItems(items, {
      mode: "automatic", itemIds: [], rule: "featured", limit: 1,
    }, { id: (item) => item.id, featured: (item) => item.featured })).toEqual([items[1]]);
  });
});
