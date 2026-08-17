import { describe, it, expect } from "vitest";
import {
  formatBrazilianPhone,
  formatInternationalPhone,
  formatPhoneNumberByDdi,
  parseStoredPhone,
  composeFullPhone,
} from "./phoneUtils";

describe("phoneUtils - formatBrazilianPhone", () => {
  it("formata DDD com 2 dígitos", () => {
    expect(formatBrazilianPhone("11")).toBe("(11");
  });

  it("formata telefone fixo (8 dígitos com DDD)", () => {
    expect(formatBrazilianPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("formata celular (9 dígitos com DDD)", () => {
    expect(formatBrazilianPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("remove caracteres não numéricos automaticamente", () => {
    expect(formatBrazilianPhone("(11) 9.8765-4321abc")).toBe("(11) 98765-4321");
  });

  it("retorna string vazia para entrada vazia", () => {
    expect(formatBrazilianPhone("")).toBe("");
  });
});

describe("phoneUtils - formatInternationalPhone", () => {
  it("formata números internacionais em blocos legíveis", () => {
    expect(formatInternationalPhone("1234567890")).toBe("123 456 7890");
  });
});

describe("phoneUtils - formatPhoneNumberByDdi", () => {
  it("usa formato brasileiro para +55", () => {
    expect(formatPhoneNumberByDdi("21999998888", "+55")).toBe("(21) 99999-8888");
  });

  it("usa formato internacional para +1", () => {
    expect(formatPhoneNumberByDdi("4155552671", "+1")).toBe("415 555 2671");
  });
});

describe("phoneUtils - parseStoredPhone", () => {
  it("extrai DDI e número formatado quando contém DDI no início", () => {
    const parsed = parseStoredPhone("+55 (11) 98765-4321");
    expect(parsed.ddi).toBe("+55");
    expect(parsed.formatted).toBe("(11) 98765-4321");
  });

  it("extrai DDI internacional quando salvo com +351", () => {
    const parsed = parseStoredPhone("+351 912345678");
    expect(parsed.ddi).toBe("+351");
    expect(parsed.formatted).toBe("912 345 678");
  });

  it("assume +55 padrão quando não há DDI explicito", () => {
    const parsed = parseStoredPhone("11987654321");
    expect(parsed.ddi).toBe("+55");
    expect(parsed.formatted).toBe("(11) 98765-4321");
  });
});

describe("phoneUtils - composeFullPhone", () => {
  it("combina DDI e número formatado", () => {
    expect(composeFullPhone("+55", "(11) 98765-4321")).toBe("+55 (11) 98765-4321");
  });

  it("retorna vazio se o número local for vazio", () => {
    expect(composeFullPhone("+55", "")).toBe("");
  });
});
