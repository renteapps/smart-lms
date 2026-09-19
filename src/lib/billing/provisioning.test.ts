import { describe, expect, it } from "vitest";
import { exactEmailPattern } from "@/lib/billing/provisioning";

describe("exactEmailPattern", () => {
  it("normaliza e mantém e-mails comuns", () => {
    expect(exactEmailPattern("  Maria@Example.com ")).toBe("maria@example.com");
  });

  it("escapa curingas do ILIKE para não casar a conta de outra pessoa", () => {
    expect(exactEmailPattern("joao_silva@x.com")).toBe("joao\\_silva@x.com");
    expect(exactEmailPattern("a%b@x.com")).toBe("a\\%b@x.com");
    expect(exactEmailPattern("a\\b@x.com")).toBe("a\\\\b@x.com");
  });
});
