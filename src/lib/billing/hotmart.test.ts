/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { normalizeHotmartEvent } from "./hotmart";

/** Formato 2.0.0, o que a Hotmart manda hoje em "Enviar teste". */
function compraAprovada(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-hotmart-001",
    creation_date: 1787577600000,
    event: "PURCHASE_APPROVED",
    version: "2.0.0",
    data: {
      product: { id: 1234567, ucode: "abc-ucode-999", name: "Curso de GTD" },
      buyer: {
        email: "Aluna@Exemplo.COM ",
        name: "Aluna Teste",
        checkout_phone: "11999998888",
        document: "12345678900",
      },
      purchase: {
        transaction: "HP17875776001234",
        order_date: 1787577600000,
        approved_date: 1787577700000,
        status: "APPROVED",
        price: { value: 497.0, currency_value: "BRL" },
        offer: { code: "oferta-black" },
        date_next_charge: 1790169600000,
      },
      subscription: {
        status: "ACTIVE",
        subscriber: { code: "SUB-XYZ-1" },
      },
    },
    ...overrides,
  };
}

describe("normalizeHotmartEvent", () => {
  it("extrai comprador, produto, oferta e transação de uma compra aprovada", () => {
    const evento = normalizeHotmartEvent(compraAprovada());

    expect(evento).not.toBeNull();
    expect(evento!.gateway).toBe("hotmart");
    expect(evento!.eventId).toBe("evt-hotmart-001");
    expect(evento!.eventType).toBe("PURCHASE_APPROVED");
    expect(evento!.action).toBe("grant");
    expect(evento!.buyer).toEqual({
      email: "aluna@exemplo.com",
      name: "Aluna Teste",
      phone: "11999998888",
      document: "12345678900",
    });
    expect(evento!.product).toEqual({ productId: "abc-ucode-999", offerId: "oferta-black" });
    expect(evento!.transaction).toEqual({
      id: "HP17875776001234",
      amount: 497,
      currency: "BRL",
      occurredAt: "2026-08-24T13:21:40.000Z",
      status: "approved",
    });
    expect(evento!.subscription).toEqual({
      gatewaySubscriptionId: "SUB-XYZ-1",
      currentPeriodEnd: "2026-09-23T13:20:00.000Z",
    });
  });

  // `ucode` é estável; `id` numérico é reaproveitável entre produtos.
  it("prefere ucode ao id numérico do produto", () => {
    const payload = compraAprovada();
    const evento = normalizeHotmartEvent(payload);
    expect(evento!.product!.productId).toBe("abc-ucode-999");
  });

  it("cai para o id numérico quando não há ucode", () => {
    const payload = compraAprovada() as any;
    delete payload.data.product.ucode;
    expect(normalizeHotmartEvent(payload)!.product!.productId).toBe("1234567");
  });

  it("converte epoch de milissegundos em ISO", () => {
    const evento = normalizeHotmartEvent(compraAprovada());
    expect(evento!.transaction!.occurredAt).toBe("2026-08-24T13:21:40.000Z");
  });

  it("compra sem oferta casa com o curinga do mapeamento", () => {
    const payload = compraAprovada() as any;
    delete payload.data.purchase.offer;
    expect(normalizeHotmartEvent(payload)!.product!.offerId).toBeUndefined();
  });

  it("reembolso vira revoke_now com status refunded", () => {
    const evento = normalizeHotmartEvent(compraAprovada({ event: "PURCHASE_REFUNDED" }));
    expect(evento!.action).toBe("revoke_now");
    expect(evento!.transaction!.status).toBe("refunded");
  });

  it("cancelamento de assinatura preserva o período pago", () => {
    const evento = normalizeHotmartEvent(compraAprovada({ event: "SUBSCRIPTION_CANCELLATION" }));
    expect(evento!.action).toBe("revoke_at_period_end");
  });

  it("evento desconhecido é normalizado mas não concede nada", () => {
    const evento = normalizeHotmartEvent(compraAprovada({ event: "ALGO_NOVO" }));
    expect(evento!.action).toBe("ignore");
  });

  // Sem id do gateway o dedupe ainda precisa reconhecer o reenvio.
  it("deriva id determinístico quando o payload não traz um", () => {
    const payload = compraAprovada() as any;
    delete payload.id;

    const a = normalizeHotmartEvent(payload)!;
    const b = normalizeHotmartEvent(JSON.parse(JSON.stringify(payload)))!;

    expect(a.eventId).toBe(b.eventId);
    expect(a.eventId).toMatch(/^derived_[0-9a-f]{32}$/);
  });

  it("id derivado difere quando o evento é outro", () => {
    const aprovada = compraAprovada() as any;
    const reembolso = compraAprovada({ event: "PURCHASE_REFUNDED" }) as any;
    delete aprovada.id;
    delete reembolso.id;

    expect(normalizeHotmartEvent(aprovada)!.eventId)
      .not.toBe(normalizeHotmartEvent(reembolso)!.eventId);
  });

  it.each([
    ["payload vazio", {}],
    ["sem evento", { data: { buyer: { email: "a@b.com" }, product: { ucode: "x" } } }],
    ["sem e-mail", { event: "PURCHASE_APPROVED", data: { product: { ucode: "x" } } }],
    ["e-mail inválido", { event: "PURCHASE_APPROVED", data: { buyer: { email: "sem-arroba" }, product: { ucode: "x" } } }],
    ["sem produto", { event: "PURCHASE_APPROVED", data: { buyer: { email: "a@b.com" } } }],
  ])("devolve null para %s", (_titulo, payload) => {
    expect(normalizeHotmartEvent(payload)).toBeNull();
  });

  it("devolve null para valores que não são objeto", () => {
    expect(normalizeHotmartEvent(null)).toBeNull();
    expect(normalizeHotmartEvent("texto")).toBeNull();
  });
});
