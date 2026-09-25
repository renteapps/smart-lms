import { beforeEach, describe, expect, it, vi } from "vitest";

const sendConfiguredEmail = vi.fn();
const generateFirstPartyAuthLink = vi.fn();
vi.mock("@/lib/resendServer", () => ({ sendConfiguredEmail: (...args: unknown[]) => sendConfiguredEmail(...args) }));
vi.mock("@/lib/auth/accessLink", () => ({
  generateFirstPartyAuthLink: (...args: unknown[]) => generateFirstPartyAuthLink(...args),
}));

import { formatAccessEnd, pendingFirstAccessEmail, sendPurchaseWelcomeEmail } from "./welcome";
import type { DB } from "@/lib/data/types";

const db = {} as DB;
const link = "https://www.plataformag6.com/auth/confirm?token_hash=abc&type=recovery";

describe("sendPurchaseWelcomeEmail", () => {
  beforeEach(() => {
    generateFirstPartyAuthLink.mockResolvedValue({ link, error: null });
    sendConfiguredEmail.mockResolvedValue({ success: true, id: "re_1" });
  });

  it("assinatura de plano usa o e-mail didático do assinante, com plano e validade", async () => {
    await sendPurchaseWelcomeEmail(db, {
      userId: "u1",
      email: "ana@x.com",
      name: "Ana Maria Souza",
      productName: "Plano Anual",
      productKind: "plan",
      accessEndsAt: "2027-09-25T15:00:00Z",
    });

    expect(generateFirstPartyAuthLink).toHaveBeenCalledWith(db, expect.objectContaining({
      kind: "recovery",
      next: "/resetar-senha?mode=update",
    }));
    const payload = sendConfiguredEmail.mock.calls[0][1];
    expect(payload.template).toBe("plan_welcome");
    expect(payload.data).toMatchObject({
      nome: "Ana",
      email: "ana@x.com",
      link_login: link,
      nome_plano: "Plano Anual",
      validade_plano: "até 25/09/2027",
    });
  });

  it("curso avulso continua com o modelo de primeiro acesso", async () => {
    await sendPurchaseWelcomeEmail(db, {
      email: "ana@x.com",
      productName: "Curso de Liderança",
      productKind: "course",
    });
    const payload = sendConfiguredEmail.mock.calls[0][1];
    expect(payload.template).toBe("welcome");
    expect(payload.data).not.toHaveProperty("nome_plano");
    expect(payload.data.nome).toBe("aluno(a)");
  });

  it("sem link de acesso não envia e não derruba o provisionamento", async () => {
    generateFirstPartyAuthLink.mockResolvedValue({ link: null, error: "User not found" });
    await expect(sendPurchaseWelcomeEmail(db, {
      email: "ana@x.com", productName: "Plano Anual", productKind: "plan",
    })).resolves.toBe(false);
    expect(sendConfiguredEmail).not.toHaveBeenCalled();
  });
});

describe("formatAccessEnd", () => {
  it("formata a data no fuso de Brasília", () => {
    expect(formatAccessEnd("2027-09-26T01:00:00Z")).toBe("até 25/09/2027");
  });

  it("sem data (ou data inválida) explica que vale enquanto a assinatura estiver ativa", () => {
    expect(formatAccessEnd(null)).toBe("enquanto a assinatura estiver ativa");
    expect(formatAccessEnd("não-é-data")).toBe("enquanto a assinatura estiver ativa");
  });
});

describe("pendingFirstAccessEmail", () => {
  type Account = { email?: string; last_sign_in_at?: string | null; app_metadata?: Record<string, unknown> };
  const dbWith = (account: Account | null, sentWelcomes = 0, logError: unknown = null) => {
    const query = {
      select: () => query,
      ilike: vi.fn(() => query),
      in: () => query,
      eq: async () => ({ count: sentWelcomes, error: logError }),
    };
    return {
      auth: { admin: { getUserById: async () => ({ data: { user: account }, error: null }) } },
      from: () => query,
    } as unknown as DB;
  };
  const fromPurchase = { email: "ana@x.com", last_sign_in_at: null, app_metadata: { provisioned_by: "gateway" } };

  it("conta de compra, sem login e sem boas-vindas enviadas: reenvia", async () => {
    await expect(pendingFirstAccessEmail(dbWith(fromPurchase), "u1")).resolves.toBe("ana@x.com");
  });

  it("não repete quando as boas-vindas já foram enviadas (segundo evento da mesma compra)", async () => {
    await expect(pendingFirstAccessEmail(dbWith(fromPurchase, 1), "u1")).resolves.toBeNull();
  });

  it("não envia para quem já entrou na plataforma", async () => {
    await expect(pendingFirstAccessEmail(dbWith({ ...fromPurchase, last_sign_in_at: "2026-09-20T10:00:00Z" }), "u1"))
      .resolves.toBeNull();
  });

  it("não envia para conta criada pelo cadastro do site", async () => {
    await expect(pendingFirstAccessEmail(dbWith({ ...fromPurchase, app_metadata: { role: "student" } }), "u1"))
      .resolves.toBeNull();
  });

  it("sem conseguir ler o histórico, prefere não repetir", async () => {
    await expect(pendingFirstAccessEmail(dbWith(fromPurchase, 0, { message: "boom" }), "u1")).resolves.toBeNull();
  });
});
