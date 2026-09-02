import { describe, expect, it } from "vitest";
import { getActionErrorMessage } from "@/lib/actionError";

describe("getActionErrorMessage", () => {
  it("preserva mensagens de Error", () => {
    expect(getActionErrorMessage(new Error("Falha conhecida."), "Falha genérica."))
      .toBe("Falha conhecida.");
  });

  it("expõe mensagem e código de erros estruturados do Supabase", () => {
    expect(getActionErrorMessage({ message: "permission denied for table", code: "42501" }, "Falha genérica."))
      .toBe("permission denied for table [42501]");
  });

  it("usa fallback para valores sem mensagem", () => {
    expect(getActionErrorMessage({ details: "sem mensagem" }, "Falha genérica."))
      .toBe("Falha genérica.");
  });
});

