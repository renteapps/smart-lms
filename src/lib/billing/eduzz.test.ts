/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { normalizeEduzzEvent } from "./eduzz";

/** Payload de contrato no formato oficial MyEduzz. */
function contratoCriado(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-eduzz-001",
    event: "myeduzz.contract_created",
    data: {
      sentDate: "2026-08-24T12:00:00Z",
      producer: { id: 998877, name: "Produtor Teste" },
      customer: {
        id: 5544,
        name: "Aluno Teste",
        email: "  Aluno@Exemplo.COM",
        phone: { countryCode: "55", areaCode: "11", number: "988887777" },
        document: "98765432100",
      },
      contract: {
        id: "CT-123456",
        status: "upToDate",
        recurrence: {
          startsAt: "2026-08-24T12:00:00Z",
          nextDue: "2026-09-24T12:00:00Z",
          price: { value: 1234.56, currency: "BRL" },
        },
        contentAccess: {
          removeOnLatePayment: true,
          removeOnContractEnd: true,
          accessExpirationDate: "2026-09-24T12:00:00Z",
        },
      },
      products: [{ id: 654321, name: "Plano Premium", offerId: "OFERTA_LANCAMENTO" }],
      invoice: { id: "INV-777", status: "paid", paidAmount: "1.234,56", paidAt: "2026-08-24T12:05:00Z" },
    },
    ...overrides,
  };
}

describe("normalizeEduzzEvent", () => {
  it("extrai comprador, produto, oferta e contrato", () => {
    const evento = normalizeEduzzEvent(contratoCriado());

    expect(evento).not.toBeNull();
    expect(evento!.gateway).toBe("eduzz");
    expect(evento!.eventId).toBe("evt-eduzz-001");
    expect(evento!.action).toBe("grant");
    expect(evento!.buyer).toEqual({
      email: "aluno@exemplo.com",
      name: "Aluno Teste",
      phone: "5511988887777",
      document: "98765432100",
    });
    expect(evento!.product).toEqual({ productId: "654321", offerId: "OFERTA_LANCAMENTO" });
    expect(evento!.subscription).toMatchObject({
      gatewaySubscriptionId: "CT-123456",
      currentPeriodEnd: "2026-09-24T12:00:00.000Z",
      gatewayStatus: "upToDate",
      localStatus: "active",
      removeOnLatePayment: true,
      removeOnContractEnd: true,
    });
  });

  // A Eduzz manda valor formatado em pt-BR em vários campos.
  it("interpreta valor no formato brasileiro", () => {
    expect(normalizeEduzzEvent(contratoCriado())!.transaction!.amount).toBe(1234.56);
  });

  it("aceita valor numérico simples", () => {
    const payload = contratoCriado() as any;
    payload.data.invoice.paidAmount = 97.5;
    expect(normalizeEduzzEvent(payload)!.transaction!.amount).toBe(97.5);
  });

  it("usa a fatura como id da transação, e o contrato como assinatura", () => {
    const evento = normalizeEduzzEvent(contratoCriado())!;
    expect(evento.transaction!.id).toBe("INV-777");
    expect(evento.subscription!.gatewaySubscriptionId).toBe("CT-123456");
  });

  it("não fabrica transação quando o contrato oficial não traz fatura", () => {
    const payload = contratoCriado() as any;
    delete payload.data.invoice;
    const evento = normalizeEduzzEvent(payload)!;
    expect(evento.transaction).toBeUndefined();
    expect(evento.subscription?.amount).toBe(1234.56);
    expect(evento.subscription?.currency).toBe("BRL");
  });

  it("reembolso corta na hora", () => {
    const evento = normalizeEduzzEvent(contratoCriado({ event: "myeduzz.invoice_refunded" }))!;
    expect(evento.action).toBe("revoke_now");
    expect(evento.transaction!.status).toBe("refunded");
  });

  it("cancelamento de contrato preserva o período pago", () => {
    expect(normalizeEduzzEvent(contratoCriado({ event: "myeduzz.contract_canceled" }))!.action)
      .toBe("revoke_at_period_end");
  });

  it("invoice_status_changed decide pelo status da fatura", () => {
    const payload = contratoCriado({ event: "myeduzz.invoice_status_changed" }) as any;
    payload.data.invoice.status = "refunded";
    expect(normalizeEduzzEvent(payload)!.action).toBe("revoke_now");

    payload.data.invoice.status = "paid";
    expect(normalizeEduzzEvent(payload)!.action).toBe("grant");
  });

  it("lê o formato antigo de notificação com campos cus_/trans_", () => {
    const evento = normalizeEduzzEvent({
      event: "myeduzz.invoice_paid",
      cus_email: "antigo@exemplo.com",
      cus_name: "Aluno Antigo",
      cus_tel: "1133334444",
      product_cod: "112233",
      trans_cod: "TR-9090",
      trans_value: "197,00",
    })!;

    expect(evento.buyer!.email).toBe("antigo@exemplo.com");
    expect(evento.product!.productId).toBe("112233");
    expect(evento.transaction!.id).toBe("TR-9090");
    expect(evento.transaction!.amount).toBe(197);
  });

  it("contrato sem próxima cobrança fica sem prazo", () => {
    const payload = contratoCriado() as any;
    delete payload.data.contract.recurrence.nextDue;
    expect(normalizeEduzzEvent(payload)!.subscription!.currentPeriodEnd).toBeNull();
  });

  it("deriva id determinístico quando o payload não traz um", () => {
    const payload = contratoCriado() as any;
    delete payload.id;

    const a = normalizeEduzzEvent(payload)!;
    const b = normalizeEduzzEvent(JSON.parse(JSON.stringify(payload)))!;

    expect(a.eventId).toBe(b.eventId);
    expect(a.eventId).toMatch(/^derived_[0-9a-f]{32}$/);
  });

  it.each([
    ["payload vazio", {}],
    ["sem evento", { data: { customer: { email: "a@b.com" }, products: [{ id: 1 }] } }],
    ["sem e-mail", { event: "myeduzz.invoice_paid", data: { products: [{ id: 1 }] } }],
    ["sem produto", { event: "myeduzz.invoice_paid", data: { customer: { email: "a@b.com" } } }],
  ])("devolve null para %s", (_titulo, payload) => {
    expect(normalizeEduzzEvent(payload)).toBeNull();
  });
});
