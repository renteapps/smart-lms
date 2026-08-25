import { describe, expect, it } from "vitest";
import { describeRenewal, describeSubscriptionStatus, subscriptionToneClasses } from "./subscriptionStatus";

describe("describeSubscriptionStatus", () => {
  it.each([
    ["active", "Ativa", "success"],
    ["trialing", "Em teste", "success"],
    ["past_due", "Em atraso", "warning"],
    ["suspended", "Suspensa", "warning"],
    ["canceled", "Cancelada", "danger"],
    ["refunded", "Reembolsada", "danger"],
    ["chargeback", "Chargeback", "danger"],
    ["expired", "Expirada", "neutral"],
    ["pending", "Pendente", "neutral"],
  ])("traduz %s", (status, label, tone) => {
    const presentation = describeSubscriptionStatus(status);
    expect(presentation.label).toBe(label);
    expect(presentation.tone).toBe(tone);
  });

  // Cobre os nove valores do CHECK em `subscriptions_status_check`: se o banco
  // ganhar um status novo, este teste é o lugar que avisa.
  it("cobre todo o vocabulário do banco", () => {
    const doBanco = [
      "active", "trialing", "pending", "past_due",
      "suspended", "canceled", "refunded", "chargeback", "expired",
    ];
    for (const status of doBanco) {
      expect(describeSubscriptionStatus(status).label).not.toBe("Desconhecido");
    }
  });

  it("degrada sem quebrar para status inesperado", () => {
    expect(describeSubscriptionStatus("algo_novo").label).toBe("algo_novo");
    expect(describeSubscriptionStatus("algo_novo").tone).toBe("neutral");
    expect(describeSubscriptionStatus(null).label).toBe("Desconhecido");
    expect(describeSubscriptionStatus(undefined).label).toBe("Desconhecido");
  });
});

describe("subscriptionToneClasses", () => {
  it("usa tokens semânticos, não cores cruas", () => {
    expect(subscriptionToneClasses("success")).toContain("success-soft");
    expect(subscriptionToneClasses("danger")).toContain("danger-soft");
    expect(subscriptionToneClasses("neutral")).toContain("default");
  });
});

describe("describeRenewal", () => {
  it("assinatura em dia mostra a próxima cobrança", () => {
    expect(describeRenewal({ status: "active", currentPeriodEnd: "2026-09-24T12:00:00Z" }))
      .toEqual({ label: "Próxima renovação", date: "2026-09-24T12:00:00Z" });
  });

  // Cancelada com período futuro não vai cobrar de novo: chamar de "próxima
  // cobrança" assustaria quem acabou de cancelar.
  it("cancelada mostra até quando o acesso vale, não uma cobrança", () => {
    expect(describeRenewal({ status: "canceled", currentPeriodEnd: "2026-09-24T12:00:00Z" }).label)
      .toBe("Acesso disponível até");
  });

  it("cancelamento agendado também vira 'disponível até'", () => {
    expect(describeRenewal({
      status: "active",
      currentPeriodEnd: "2026-09-24T12:00:00Z",
      cancelAtPeriodEnd: true,
    }).label).toBe("Acesso disponível até");
  });

  it("ativa sem prazo é vitalícia", () => {
    expect(describeRenewal({ status: "active", currentPeriodEnd: null }))
      .toEqual({ label: "Acesso sem prazo", date: null });
  });

  it("status encerrado sem data não promete acesso", () => {
    expect(describeRenewal({ status: "expired", currentPeriodEnd: null }))
      .toEqual({ label: "Sem data de renovação", date: null });
  });
});
