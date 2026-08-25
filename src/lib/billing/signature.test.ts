import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifyEduzzSignature,
  verifyHotmartRequest,
  verifyHotmartSignature,
  verifyHotmartToken,
} from "./signature";

const BODY = JSON.stringify({ event: "myeduzz.invoice_paid", data: { id: 42 } });
const SECRET = "chave-secreta-da-eduzz";

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

describe("verifyEduzzSignature", () => {
  it("aceita assinatura HMAC-SHA256 válida do corpo bruto", () => {
    expect(verifyEduzzSignature(BODY, sign(BODY, SECRET), [SECRET])).toBe(true);
  });

  it("valida os bytes crus sem conversão intermediária", () => {
    const bytes = Buffer.from(BODY, "utf8");
    expect(verifyEduzzSignature(bytes, sign(BODY, SECRET), [SECRET])).toBe(true);
  });

  it("aceita assinatura em maiúsculas", () => {
    expect(verifyEduzzSignature(BODY, sign(BODY, SECRET).toUpperCase(), [SECRET])).toBe(true);
  });

  it("recusa assinatura calculada com outra chave", () => {
    expect(verifyEduzzSignature(BODY, sign(BODY, "outra-chave"), [SECRET])).toBe(false);
  });

  it("recusa quando o corpo foi alterado depois de assinado", () => {
    const assinatura = sign(BODY, SECRET);
    const adulterado = JSON.stringify({ event: "myeduzz.invoice_paid", data: { id: 999 } });
    expect(verifyEduzzSignature(adulterado, assinatura, [SECRET])).toBe(false);
  });

  it("aceita qualquer chave da lista, permitindo rotação sem downtime", () => {
    const chaveNova = "chave-nova";
    expect(verifyEduzzSignature(BODY, sign(BODY, chaveNova), [SECRET, chaveNova])).toBe(true);
    expect(verifyEduzzSignature(BODY, sign(BODY, SECRET), [SECRET, chaveNova])).toBe(true);
  });

  it("recusa quando o header não veio", () => {
    expect(verifyEduzzSignature(BODY, null, [SECRET])).toBe(false);
    expect(verifyEduzzSignature(BODY, "   ", [SECRET])).toBe(false);
  });

  // Esta é a garantia central: sem segredo configurado a rota não pode virar
  // um endpoint aberto de concessão de acesso pago.
  it("falha fechada quando não há nenhum segredo configurado", () => {
    expect(verifyEduzzSignature(BODY, sign(BODY, SECRET), [])).toBe(false);
    expect(verifyEduzzSignature(BODY, sign(BODY, SECRET), [null, undefined, "  "])).toBe(false);
  });
});

describe("verifyHotmartToken", () => {
  it("aceita o hottok exato da conta", () => {
    expect(verifyHotmartToken("hottok-abc", ["hottok-abc"])).toBe(true);
  });

  it("recusa token diferente, inclusive prefixo do correto", () => {
    expect(verifyHotmartToken("hottok-abd", ["hottok-abc"])).toBe(false);
    expect(verifyHotmartToken("hottok", ["hottok-abc"])).toBe(false);
  });

  it("falha fechada sem segredo e sem header", () => {
    expect(verifyHotmartToken("hottok-abc", [])).toBe(false);
    expect(verifyHotmartToken(null, ["hottok-abc"])).toBe(false);
  });
});

describe("verifyHotmartSignature", () => {
  it("aceita HMAC do corpo bruto", () => {
    expect(verifyHotmartSignature(BODY, sign(BODY, SECRET), [SECRET])).toBe(true);
  });

  it("falha fechada sem segredo", () => {
    expect(verifyHotmartSignature(BODY, sign(BODY, SECRET), [])).toBe(false);
  });
});

describe("verifyHotmartRequest", () => {
  it("aceita contas antigas, que mandam hottok", () => {
    expect(verifyHotmartRequest({
      rawBody: BODY,
      hottokHeader: "hottok-abc",
      signatureHeader: null,
      secrets: ["hottok-abc"],
    })).toBe(true);
  });

  it("aceita contas novas, que mandam assinatura HMAC", () => {
    expect(verifyHotmartRequest({
      rawBody: BODY,
      hottokHeader: null,
      signatureHeader: sign(BODY, SECRET),
      secrets: [SECRET],
    })).toBe(true);
  });

  it("recusa quando nenhum dos dois mecanismos confere", () => {
    expect(verifyHotmartRequest({
      rawBody: BODY,
      hottokHeader: "errado",
      signatureHeader: sign(BODY, "outra"),
      secrets: [SECRET],
    })).toBe(false);
  });

  it("recusa requisição sem nenhum header de autenticação", () => {
    expect(verifyHotmartRequest({
      rawBody: BODY,
      secrets: [SECRET],
    })).toBe(false);
  });
});
