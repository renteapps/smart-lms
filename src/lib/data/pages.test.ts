import { describe, expect, it } from "vitest";
import { deriveHasActiveProductAccess } from "./pages";

describe("deriveHasActiveProductAccess", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("nega usuário sem produtos ou somente com produtos expirados", () => {
    expect(deriveHasActiveProductAccess([], [], now)).toBe(false);
    expect(deriveHasActiveProductAccess(
      [{ status: "active", expires_at: "2026-08-24T12:00:00.000Z" }],
      [{ status: "canceled", current_period_end: "2026-08-24T12:00:00.000Z", plans: { is_active: true } }],
      now,
    )).toBe(false);
  });

  it("aceita matrícula ativa", () => {
    expect(deriveHasActiveProductAccess([{ status: "active", expires_at: null }], [], now)).toBe(true);
  });

  it("aceita plano ativo ou em período de acesso e ignora plano desativado", () => {
    expect(deriveHasActiveProductAccess([], [{ status: "active", current_period_end: null, plans: { is_active: true } }], now)).toBe(true);
    expect(deriveHasActiveProductAccess([], [{ status: "past_due", current_period_end: "2026-08-26T12:00:00.000Z", plans: { is_active: true } }], now)).toBe(true);
    expect(deriveHasActiveProductAccess([], [{ status: "active", current_period_end: null, plans: { is_active: false } }], now)).toBe(false);
  });
});
