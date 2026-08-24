import { describe, expect, it } from "vitest";
import { buildAiCreditForecast, countAiEntitlementWindows } from "./aiCreditForecast";

const now = new Date("2026-08-24T12:00:00.000Z");
const yearlyPlan = {
  id: "yearly",
  name: "Plano Anual",
  frequency: "yearly",
  price: 1200,
  isActive: true,
  dailyCredits: 25,
  weeklyCredits: 100,
  monthlyCredits: 400,
};

const base = {
  now,
  creditValueBrl: 0.01,
  reserveMarginPercent: 50,
  operationalBufferPercent: 25,
  plans: [yearlyPlan],
  subscriptions: [],
  memberships: [],
  accounts: [],
};

describe("AI credit future commitment", () => {
  it("counts 13 calendar allowances for a yearly contract sold mid-month", () => {
    expect(countAiEntitlementWindows(now, new Date("2027-08-24T12:00:00.000Z"))).toBe(13);
    const forecast = buildAiCreditForecast(base);
    expect(forecast.planStress[0]).toMatchObject({ entitlementWindows: 13, futureCredits: 5200 });
    expect(forecast.planStress[0].nominalCommitmentBrl).toBe(52);
    expect(forecast.planStress[0].protectedProviderCostBrl).toBe(26);
    expect(forecast.planStress[0].recommendedCashBrl).toBe(32.5);
  });

  it("subtracts credits already consumed in the current month", () => {
    const forecast = buildAiCreditForecast({
      ...base,
      subscriptions: [{
        id: "sub-yearly", userId: "user-1", organizationId: null, planId: "yearly", status: "active",
        amount: 1200, startedAt: now.toISOString(), currentPeriodEnd: "2027-08-24T12:00:00.000Z", createdAt: now.toISOString(),
      }],
      accounts: [{ userId: "user-1", monthlyUsed: 75.5, monthlyPeriodStartedAt: "2026-08-01T03:00:00.000Z", extraBalance: 0 }],
    });
    expect(forecast.contractedCredits).toBe(5124.5);
    expect(forecast.beneficiaries).toBe(1);
  });

  it("uses an individual plan before an organization plan", () => {
    const organizationPlan = { ...yearlyPlan, id: "org", name: "Empresarial", monthlyCredits: 800 };
    const forecast = buildAiCreditForecast({
      ...base,
      plans: [yearlyPlan, organizationPlan],
      subscriptions: [
        { id: "individual", userId: "user-1", organizationId: null, planId: "yearly", status: "active", amount: 1200, startedAt: now.toISOString(), currentPeriodEnd: "2026-10-01T00:00:00.000Z", createdAt: now.toISOString() },
        { id: "company", userId: null, organizationId: "org-1", planId: "org", status: "active", amount: 2000, startedAt: now.toISOString(), currentPeriodEnd: "2026-10-01T00:00:00.000Z", createdAt: now.toISOString() },
      ],
      memberships: [{ userId: "user-1", organizationId: "org-1", status: "active" }],
    });
    expect(forecast.rows).toHaveLength(1);
    expect(forecast.rows[0].subscriptionId).toBe("individual");
    expect(forecast.contractedCredits).toBe(800);
  });

  it("adds outstanding extra credits to the cash obligation", () => {
    const forecast = buildAiCreditForecast({
      ...base,
      accounts: [{ userId: "user-1", monthlyUsed: 0, monthlyPeriodStartedAt: now.toISOString(), extraBalance: 100 }],
    });
    expect(forecast.totalFutureCredits).toBe(100);
    expect(forecast.nominalCommitmentBrl).toBe(1);
    expect(forecast.recommendedCashBrl).toBe(0.63);
  });

  it("never exposes negative zero in an empty cash forecast", () => {
    const forecast = buildAiCreditForecast(base);
    expect(forecast.recommendedCashBrl).toBe(0);
    expect(Object.is(forecast.recommendedCashBrl, -0)).toBe(false);
  });

  it("estimates missing end dates from the plan frequency", () => {
    const forecast = buildAiCreditForecast({
      ...base,
      subscriptions: [{
        id: "missing-end", userId: "user-1", organizationId: null, planId: "yearly", status: "active",
        amount: 1200, startedAt: now.toISOString(), currentPeriodEnd: null, createdAt: now.toISOString(),
      }],
    });
    expect(forecast.rows[0].isEstimatedPeriod).toBe(true);
    expect(forecast.rows[0].entitlementWindows).toBe(13);
  });
});
