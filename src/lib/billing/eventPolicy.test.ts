import { describe, expect, it } from "vitest";
import { outcomeGrantsAccess, resolveEduzzOutcome, resolveHotmartOutcome } from "./eventPolicy";

describe("resolveHotmartOutcome", () => {
  it.each([
    ["PURCHASE_APPROVED", "grant", "approved"],
    ["PURCHASE_COMPLETE", "grant", "approved"],
    ["SWITCH_PLAN", "grant", "approved"],
  ])("libera acesso em %s", (evento, acao, status) => {
    expect(resolveHotmartOutcome(evento)).toEqual({ action: acao, transactionStatus: status });
  });

  it.each(["PURCHASE_CANCELED", "SUBSCRIPTION_CANCELLATION"])(
    "%s preserva o período já pago",
    (evento) => {
      expect(resolveHotmartOutcome(evento)).toEqual({
        action: "revoke_at_period_end",
        transactionStatus: "canceled",
      });
    },
  );

  it.each([
    ["PURCHASE_REFUNDED", "refunded"],
    ["PURCHASE_CHARGEBACK", "chargeback"],
    ["PURCHASE_PROTEST", "chargeback"],
  ])("%s corta o acesso na hora", (evento, status) => {
    expect(resolveHotmartOutcome(evento)).toEqual({ action: "revoke_now", transactionStatus: status });
  });

  it("boleto atrasado marca inadimplência sem revogar", () => {
    expect(resolveHotmartOutcome("PURCHASE_DELAYED").action).toBe("past_due");
  });

  it.each(["PURCHASE_BILLET_PRINTED", "PURCHASE_EXPIRED", "CLUB_FIRST_ACCESS", "UPDATE_SUBSCRIPTION_CHARGE_DATE"])(
    "%s não mexe no acesso",
    (evento) => {
      expect(resolveHotmartOutcome(evento).action).toBe("ignore");
    },
  );

  it("normaliza caixa do nome do evento", () => {
    expect(resolveHotmartOutcome("purchase_approved").action).toBe("grant");
  });

  // A garantia que importa: gateway lança evento novo e isso nunca vira acesso.
  it("ignora evento desconhecido em vez de conceder", () => {
    expect(resolveHotmartOutcome("EVENTO_QUE_NAO_EXISTE").action).toBe("ignore");
    expect(resolveHotmartOutcome("").action).toBe("ignore");
  });
});

describe("resolveEduzzOutcome", () => {
  it.each(["myeduzz.invoice_paid", "myeduzz.contract_renewed"])(
    "%s libera acesso",
    (evento) => {
      expect(resolveEduzzOutcome(evento)).toEqual({ action: "grant", transactionStatus: "approved" });
    },
  );

  it.each([
    ["upToDate", "grant", "active"],
    ["free", "grant", "active"],
    ["trial", "grant", "trialing"],
    ["awaitingPayment", "sync", "pending"],
    ["late", "past_due", "past_due"],
    ["defaulter", "past_due", "past_due"],
    ["suspended", "sync", "suspended"],
    ["canceled", "revoke_at_period_end", "canceled"],
    ["finished", "sync", "expired"],
  ])("contract_updated com %s vira %s/%s", (status, action, localStatus) => {
    expect(resolveEduzzOutcome("myeduzz.contract_updated", status)).toMatchObject({ action, localStatus });
  });

  it("cancelamento de contrato preserva o período pago", () => {
    expect(resolveEduzzOutcome("myeduzz.contract_canceled")).toEqual({
      action: "revoke_at_period_end",
      transactionStatus: "canceled",
    });
  });

  it.each([
    ["myeduzz.invoice_refunded", "refunded"],
    ["myeduzz.invoice_chargeback", "chargeback"],
  ])("%s corta na hora", (evento, status) => {
    expect(resolveEduzzOutcome(evento)).toEqual({ action: "revoke_now", transactionStatus: status });
  });

  it("normaliza caixa do nome do evento", () => {
    expect(resolveEduzzOutcome("MyEduzz.Invoice_Paid").action).toBe("grant");
  });

  it("ignora evento desconhecido", () => {
    expect(resolveEduzzOutcome("myeduzz.coisa_nova").action).toBe("ignore");
  });

  describe("invoice_status_changed decide pelo status do corpo", () => {
    it.each([
      ["paid", "grant"],
      ["refunded", "revoke_now"],
      ["chargeback", "revoke_now"],
      ["canceled", "revoke_at_period_end"],
      ["overdue", "past_due"],
      ["waiting_payment", "ignore"],
    ])("status %s vira %s", (status, acao) => {
      expect(resolveEduzzOutcome("myeduzz.invoice_status_changed", status).action).toBe(acao);
    });

    it("sem status, ou com status desconhecido, não mexe no acesso", () => {
      expect(resolveEduzzOutcome("myeduzz.invoice_status_changed").action).toBe("ignore");
      expect(resolveEduzzOutcome("myeduzz.invoice_status_changed", "sei_la").action).toBe("ignore");
    });
  });
});

describe("outcomeGrantsAccess", () => {
  it("só `grant` estende acesso", () => {
    expect(outcomeGrantsAccess({ action: "grant", transactionStatus: "approved" })).toBe(true);
    expect(outcomeGrantsAccess({ action: "past_due", transactionStatus: "pending" })).toBe(false);
    expect(outcomeGrantsAccess({ action: "revoke_now", transactionStatus: "refunded" })).toBe(false);
  });
});
