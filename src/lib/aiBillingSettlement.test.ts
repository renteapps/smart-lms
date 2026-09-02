import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("liquidação de aula personalizada", () => {
  let calculateAiSettlement: typeof import("@/lib/aiBilling")["calculateAiSettlement"];

  beforeAll(async () => {
    ({ calculateAiSettlement } = await import("@/lib/aiBilling"));
  });

  it("cobra o uso real e nunca ultrapassa a reserva confirmada", () => {
    const base = {
      eventId: "event",
      feature: "personalized_lesson" as const,
      model: "modelo",
      exchangeRate: 5,
      creditValueBrl: 0.01,
      marginPercent: 0,
      exchangeBufferPercent: 0,
      promptUsdPerMillion: 1,
      completionUsdPerMillion: 1,
      chargeUser: true,
      maxOutputTokens: 4000,
    };
    const response = {
      success: true,
      text: "aula",
      usage: { promptTokens: 1_000, completionTokens: 1_000, totalTokens: 2_000, costUsd: 10 },
    };
    expect(calculateAiSettlement({ ...base, reservedCredits: 3 }, response).creditsCharged).toBe(3);
    expect(calculateAiSettlement({ ...base, reservedCredits: 10_000 }, { ...response, usage: { ...response.usage, costUsd: 0.002 } }).creditsCharged)
      .toBeLessThan(10_000);
  });
});
