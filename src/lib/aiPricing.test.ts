import { describe, expect, it } from "vitest";
import { calculateAiPrice, calculateTokenCostUsd, estimateMessagesTokens } from "./aiPricing";

describe("calculateAiPrice", () => {
  it("aplica câmbio, proteção, margem e arredondamento em créditos", () => {
    expect(calculateAiPrice({
      providerCostUsd: 0.01,
      exchangeRate: 5,
      exchangeBufferPercent: 10,
      marginPercent: 50,
      creditValueBrl: 0.01,
    })).toEqual({
      providerCostBrl: 0.05,
      protectedCostBrl: 0.05500000000000001,
      nominalRevenueBrl: 0.11,
      credits: 11,
    });
  });

  it("cobra pelo menos um crédito em chamadas muito baratas", () => {
    expect(calculateAiPrice({
      providerCostUsd: 0,
      exchangeRate: 5,
      exchangeBufferPercent: 10,
      marginPercent: 50,
      creditValueBrl: 0.01,
    }).credits).toBe(1);
  });

  it("mantém o mínimo monetário de um centavo quando o crédito vale menos", () => {
    expect(calculateAiPrice({
      providerCostUsd: 0,
      exchangeRate: 5,
      exchangeBufferPercent: 10,
      marginPercent: 50,
      creditValueBrl: 0.0025,
    })).toMatchObject({ credits: 4, nominalRevenueBrl: 0.01 });
  });

  it("estima custo por tokens e tamanho aproximado do prompt", () => {
    expect(calculateTokenCostUsd(2_000, 500, 3, 15)).toBeCloseTo(0.0135);
    expect(estimateMessagesTokens([{ content: "12345678" }])).toBe(2);
  });
});
