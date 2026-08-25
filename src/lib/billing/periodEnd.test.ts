import { describe, expect, it } from "vitest";
import { addMonthsUtc, resolveAccessEnd, resolveRevocationEnd } from "./periodEnd";

const AGORA = new Date("2026-08-24T12:00:00.000Z");

describe("addMonthsUtc", () => {
  it("soma um mês normalmente", () => {
    expect(addMonthsUtc(new Date("2026-08-24T12:00:00Z"), 1).toISOString())
      .toBe("2026-09-24T12:00:00.000Z");
  });

  // O pulo de mês do JS: 31/01 + 1 mês daria 03/03 com aritmética ingênua.
  it("limita ao último dia do mês de destino em vez de pular o mês", () => {
    expect(addMonthsUtc(new Date("2026-01-31T12:00:00Z"), 1).toISOString())
      .toBe("2026-02-28T12:00:00.000Z");
  });

  it("respeita ano bissexto", () => {
    expect(addMonthsUtc(new Date("2028-01-31T12:00:00Z"), 1).toISOString())
      .toBe("2028-02-29T12:00:00.000Z");
  });

  it("soma doze meses para o plano anual", () => {
    expect(addMonthsUtc(new Date("2026-08-24T12:00:00Z"), 12).toISOString())
      .toBe("2027-08-24T12:00:00.000Z");
  });
});

describe("resolveAccessEnd", () => {
  it("a data do gateway ganha de tudo", () => {
    expect(resolveAccessEnd({
      gatewayPeriodEnd: "2026-12-31T00:00:00Z",
      accessDays: 30,
      frequency: "monthly",
      now: AGORA,
    })).toBe("2026-12-31T00:00:00.000Z");
  });

  it("ignora data inválida do gateway e cai para o prazo da oferta", () => {
    expect(resolveAccessEnd({
      gatewayPeriodEnd: "data-invalida",
      accessDays: 30,
      now: AGORA,
    })).toBe("2026-09-23T23:59:59.999Z");
  });

  it("usa access_days da oferta, terminando no fim do dia", () => {
    expect(resolveAccessEnd({ accessDays: 365, now: AGORA })).toBe("2027-08-24T23:59:59.999Z");
  });

  it("cai para a frequência do plano quando não há prazo cadastrado", () => {
    expect(resolveAccessEnd({ frequency: "monthly", now: AGORA })).toBe("2026-09-24T12:00:00.000Z");
    expect(resolveAccessEnd({ frequency: "yearly", now: AGORA })).toBe("2027-08-24T12:00:00.000Z");
  });

  it("plano vitalício não tem data de fim", () => {
    expect(resolveAccessEnd({ frequency: "lifetime", now: AGORA })).toBeNull();
  });

  it("custom sem access_days fica sem prazo dedutível", () => {
    expect(resolveAccessEnd({ frequency: "custom", now: AGORA })).toBeNull();
  });

  it("sem nenhuma informação, acesso sem prazo", () => {
    expect(resolveAccessEnd({ now: AGORA })).toBeNull();
  });

  it("ignora access_days não positivo ou não numérico", () => {
    expect(resolveAccessEnd({ accessDays: 0, frequency: "monthly", now: AGORA }))
      .toBe("2026-09-24T12:00:00.000Z");
    expect(resolveAccessEnd({ accessDays: -5, frequency: "lifetime", now: AGORA })).toBeNull();
  });
});

describe("resolveRevocationEnd", () => {
  it("reembolso e chargeback cortam na hora", () => {
    expect(resolveRevocationEnd({
      mode: "now",
      currentPeriodEnd: "2026-12-31T00:00:00Z",
      now: AGORA,
    })).toBe(AGORA.toISOString());
  });

  it("cancelamento preserva o período já pago", () => {
    expect(resolveRevocationEnd({
      mode: "period_end",
      currentPeriodEnd: "2026-12-31T00:00:00Z",
      now: AGORA,
    })).toBe("2026-12-31T00:00:00.000Z");
  });

  // Sem período conhecido não há "fim do período" a respeitar; o lado seguro é
  // cortar agora em vez de conceder acesso indefinido.
  it("cancelamento sem período conhecido corta na hora", () => {
    expect(resolveRevocationEnd({ mode: "period_end", currentPeriodEnd: null, now: AGORA }))
      .toBe(AGORA.toISOString());
  });

  it("cancelamento com período já vencido corta na hora", () => {
    expect(resolveRevocationEnd({
      mode: "period_end",
      currentPeriodEnd: "2026-01-01T00:00:00Z",
      now: AGORA,
    })).toBe(AGORA.toISOString());
  });
});
