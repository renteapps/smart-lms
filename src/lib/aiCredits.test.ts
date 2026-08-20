import { describe, expect, it } from "vitest";
import { parseAiCreditBalance } from "./aiCredits";

describe("parseAiCreditBalance", () => {
  it("converte o retorno JSON do RPC para o modelo da interface", () => {
    expect(parseAiCreditBalance({
      daily_remaining: 4,
      daily_limit: 25,
      daily_renews_at: "2026-08-21T03:00:00Z",
      weekly_remaining: 8,
      weekly_limit: 10,
      weekly_renews_at: "2026-08-24T03:00:00Z",
      monthly_remaining: 32,
      monthly_limit: 40,
      monthly_renews_at: "2026-09-01T03:00:00Z",
      additional_credits: 25,
      available_credits: 33,
      credit_value_brl: 0.01,
    })).toEqual({
      dailyRemaining: 4,
      dailyLimit: 25,
      dailyRenewsAt: "2026-08-21T03:00:00Z",
      weeklyRemaining: 8,
      weeklyLimit: 10,
      weeklyRenewsAt: "2026-08-24T03:00:00Z",
      monthlyRemaining: 32,
      monthlyLimit: 40,
      monthlyRenewsAt: "2026-09-01T03:00:00Z",
      additionalCredits: 25,
      availableCredits: 33,
      creditValueBrl: 0.01,
    });
  });

  it("rejeita respostas sem datas de renovação", () => {
    expect(parseAiCreditBalance({ weekly_remaining: 10 })).toBeNull();
  });

  it("nunca expõe saldos negativos ou fracionários", () => {
    const balance = parseAiCreditBalance({
      daily_remaining: 4.9,
      daily_limit: 25,
      daily_renews_at: "2026-08-21T03:00:00Z",
      weekly_remaining: -3,
      weekly_limit: 10.8,
      weekly_renews_at: "2026-08-24T03:00:00Z",
      monthly_remaining: 39.9,
      monthly_limit: 40,
      monthly_renews_at: "2026-09-01T03:00:00Z",
      additional_credits: -1,
      available_credits: 9.7,
    });

    expect(balance).toMatchObject({
      weeklyRemaining: 0,
      weeklyLimit: 10,
      monthlyRemaining: 39,
      additionalCredits: 0,
      availableCredits: 9,
    });
  });
});
