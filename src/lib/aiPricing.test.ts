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

  it("respeita minimumCredits quando informado ou gera créditos fracionários proporcionais", () => {
    expect(calculateAiPrice({
      providerCostUsd: 0,
      exchangeRate: 5,
      exchangeBufferPercent: 10,
      marginPercent: 50,
      creditValueBrl: 0.01,
      minimumCredits: 1,
    }).credits).toBe(1);

    expect(calculateAiPrice({
      providerCostUsd: 0.0001,
      exchangeRate: 5,
      exchangeBufferPercent: 0,
      marginPercent: 0,
      creditValueBrl: 0.01,
    }).credits).toBe(0.05);
  });

  it("calcula receita nominal com base nos créditos fracionários", () => {
    const result = calculateAiPrice({
      providerCostUsd: 0.001,
      exchangeRate: 5,
      exchangeBufferPercent: 10,
      marginPercent: 50,
      creditValueBrl: 0.01,
    });
    expect(result.credits).toBe(1.1);
    expect(result.nominalRevenueBrl).toBeCloseTo(0.011);
  });

  it("estima custo por tokens e tamanho aproximado do prompt", () => {
    expect(calculateTokenCostUsd(2_000, 500, 3, 15)).toBeCloseTo(0.0135);
    expect(estimateMessagesTokens([{ content: "12345678" }])).toBe(2);
  });
});
