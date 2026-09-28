import { describe, expect, it } from "vitest";

import { DAY_MS, planLifecycleEmail, type LifecycleSubscription } from "./lifecyclePlan";

const NOW = new Date("2026-09-27T12:00:00Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY_MS).toISOString();

const recurring = (endInDays: number, extra: Partial<LifecycleSubscription> = {}): LifecycleSubscription => ({
  id: "s1",
  user_id: "u1",
  status: "active",
  gateway: "hotmart",
  cancel_at_period_end: false,
  current_period_end: at(endInDays),
  ...extra,
});
const canceled = (endInDays: number, extra: Partial<LifecycleSubscription> = {}) =>
  recurring(endInDays, { status: "canceled", cancel_at_period_end: true, ...extra });
const manual = (endInDays: number, extra: Partial<LifecycleSubscription> = {}) =>
  recurring(endInDays, { gateway: "manual", ...extra });

describe("planLifecycleEmail — antes do vencimento", () => {
  it("fora da janela de 7 dias não manda nada", () => {
    expect(planLifecycleEmail(recurring(7.5), NOW)).toBeNull();
    expect(planLifecycleEmail(canceled(30), NOW)).toBeNull();
  });

  it("recorrente recebe lembrete de renovação", () => {
    expect(planLifecycleEmail(recurring(7), NOW)).toBe("renewal_reminder");
    expect(planLifecycleEmail(recurring(0.5), NOW)).toBe("renewal_reminder");
  });

  it("cancelada e manual recebem aviso de fim de acesso", () => {
    expect(planLifecycleEmail(canceled(5), NOW)).toBe("expiration_warning");
    expect(planLifecycleEmail(manual(5), NOW)).toBe("expiration_warning");
  });

  it("suspensa ou pendente não recebe aviso", () => {
    expect(planLifecycleEmail(recurring(5, { status: "pending" }), NOW)).toBeNull();
  });
});

describe("planLifecycleEmail — depois do vencimento", () => {
  it("cancelada: expirou no próprio dia", () => {
    expect(planLifecycleEmail(canceled(-0.1), NOW)).toBe("subscription_expired");
    expect(planLifecycleEmail(canceled(-2.9), NOW)).toBe("subscription_expired");
  });

  it("recorrente espera 3 dias de carência (retentativas de cobrança)", () => {
    expect(planLifecycleEmail(recurring(-1), NOW)).toBeNull();
    expect(planLifecycleEmail(recurring(-2.9), NOW)).toBeNull();
    expect(planLifecycleEmail(recurring(-3), NOW)).toBe("subscription_expired");
  });

  it("recorrente marcada expired pelo cron continua com carência", () => {
    expect(planLifecycleEmail(recurring(-1, { status: "expired" }), NOW)).toBeNull();
  });

  it("sequência de reconquista nos dias 3, 10, 20 e 30", () => {
    expect(planLifecycleEmail(canceled(-3), NOW)).toBe("winback_1");
    expect(planLifecycleEmail(canceled(-9.9), NOW)).toBe("winback_1");
    expect(planLifecycleEmail(canceled(-10), NOW)).toBe("winback_2");
    expect(planLifecycleEmail(canceled(-20), NOW)).toBe("winback_3");
    expect(planLifecycleEmail(canceled(-30), NOW)).toBe("winback_4");
    expect(planLifecycleEmail(canceled(-36.9), NOW)).toBe("winback_4");
  });

  it("depois do último passo não manda mais nada", () => {
    expect(planLifecycleEmail(canceled(-37), NOW)).toBeNull();
    expect(planLifecycleEmail(canceled(-200), NOW)).toBeNull();
  });

  it("recorrente: a sequência também começa depois da carência", () => {
    expect(planLifecycleEmail(recurring(-6), NOW)).toBe("winback_1");
    expect(planLifecycleEmail(recurring(-13), NOW)).toBe("winback_2");
  });
});

describe("planLifecycleEmail — quem nunca recebe", () => {
  it("renovou: término no futuro distante", () => {
    expect(planLifecycleEmail(recurring(360), NOW)).toBeNull();
  });

  it("estorno, chargeback, sem usuário ou vitalício", () => {
    expect(planLifecycleEmail(canceled(-5, { status: "refunded" }), NOW)).toBeNull();
    expect(planLifecycleEmail(canceled(-5, { status: "chargeback" }), NOW)).toBeNull();
    expect(planLifecycleEmail(canceled(-5, { user_id: null }), NOW)).toBeNull();
    expect(planLifecycleEmail(recurring(0, { current_period_end: null }), NOW)).toBeNull();
  });
});
