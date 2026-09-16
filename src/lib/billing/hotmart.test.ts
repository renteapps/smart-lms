/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { normalizeHotmartEvent } from "./hotmart";

/**
 * Formato 2.0.0. O aninhamento de `subscription` aqui (dentro de
 * `data.purchase`, não em `data.subscription` solto) é o que o payload real
 * de "Enviar teste" da Hotmart manda — confirmado direto no
 * `gateway_webhook_events.payload` de um evento recebido de verdade. Um
 * fixture anterior usava `data.subscription.subscriber.code` (nível errado);
 * o código passava nos testes mas nunca extraía o `subscriber_code` de um
 * payload real, e a compra "processava" sem gravar assinatura nenhuma.
 */
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
        subscription: {
          status: "ACTIVE",
          subscriber: { code: "SUB-XYZ-1" },
        },
      },
    },
    ...overrides,
  };
}

/**
 * Payload real recebido via "Enviar teste" da Hotmart (v2.0.0), capturado de
 * `gateway_webhook_events.payload` — sem editar a forma, só os dados de
 * exemplo (já fictícios/sandbox da própria Hotmart). `product.id` é `0` de
 * propósito nesse exemplo; `subscriber.code` fica em
 * `data.purchase.subscription.subscriber.code`.
 */
function compraAssinaturaRealDaHotmart(overrides: Record<string, unknown> = {}) {
  return {
    id: "7a94be24-be8e-430c-81f4-14aa625ecaf6",
    event: "PURCHASE_APPROVED",
    version: "2.0.0",
    creation_date: 1789580540058,
    data: {
      buyer: { name: "Teste Comprador", email: "testeComprador271101postman15@example.com", document: "69526128664" },
      product: { id: 0, sku: "HTM_SANDBOX", name: "Produto test postback2", ucode: "fb056612-bcc6-4217-9e6d-2a5d1110ac2f" },
      purchase: {
        offer: { code: "test" },
        price: { value: 1500, currency_value: "BRL" },
        status: "APPROVED",
        order_date: 1511783344000,
        approved_date: 1511783346000,
        transaction: "HP16015479281022",
        subscription: { plan: { id: 123, name: "plano de teste" }, status: "ACTIVE", subscriber: { code: "I9OT62C3" } },
      },
    },
    ...overrides,
  };
}

/**
 * Payload real de `SUBSCRIPTION_CANCELLATION` (mesma origem). O
 * `subscriber.code` fica direto em `data.subscriber.code` — nem em
 * `data.subscription` nem em `data.purchase.subscription`. `data.subscription.id`
 * (4148584) é o id interno da assinatura, não o `subscriber_code`; era o que o
 * código antigo pegava por engano.
 */
function cancelamentoRealDaHotmart(overrides: Record<string, unknown> = {}) {
  return {
    id: "6262b875-1b4a-458d-89f9-a801ef03777e",
    event: "SUBSCRIPTION_CANCELLATION",
    version: "2.0.0",
    creation_date: 1789580540012,
    data: {
      product: { id: 788921, name: "Product name com ç e á" },
      subscriber: { code: "0000aaaa", name: "User name", email: "test@hotmart.com" },
      subscription: { id: 4148584, plan: { id: 114680, name: "Subscription Plan Name" } },
      date_next_charge: 1617105600000,
      cancellation_date: 1609181285500,
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

  describe("payloads reais capturados de gateway_webhook_events", () => {
    it("compra de assinatura: subscriber_code vem de data.purchase.subscription.subscriber.code", () => {
      const evento = normalizeHotmartEvent(compraAssinaturaRealDaHotmart());
      expect(evento!.subscription?.gatewaySubscriptionId).toBe("I9OT62C3");
      expect(evento!.product).toEqual({ productId: "fb056612-bcc6-4217-9e6d-2a5d1110ac2f", offerId: "test" });
      expect(evento!.buyer?.email).toBe("testecomprador271101postman15@example.com");
    });

    it("cancelamento: subscriber_code vem de data.subscriber.code, não de data.subscription.id", () => {
      const evento = normalizeHotmartEvent(cancelamentoRealDaHotmart());
      // 4148584 é data.subscription.id (número interno) — nunca deve ser usado como subscriber_code.
      expect(evento!.subscription?.gatewaySubscriptionId).toBe("0000aaaa");
      expect(evento!.subscription?.gatewaySubscriptionId).not.toBe("4148584");
      expect(evento!.buyer?.email).toBe("test@hotmart.com");
    });

    it("cancelamento: date_next_charge de data.date_next_charge vira o fim do período", () => {
      const evento = normalizeHotmartEvent(cancelamentoRealDaHotmart());
      expect(evento!.subscription?.currentPeriodEnd).toBe(new Date(1617105600000).toISOString());
    });

    it("cancelamento sem ucode: productId cai para o id numérico (não bate com gateway_products por ucode, mas não impede a revogação)", () => {
      const evento = normalizeHotmartEvent(cancelamentoRealDaHotmart());
      expect(evento!.product?.productId).toBe("788921");
    });

    it("data.subscription.id nunca vence quando um caminho correto de subscriber.code existe", () => {
      const payload = compraAssinaturaRealDaHotmart();
      (payload.data.purchase.subscription as Record<string, unknown>).id = 999999;
      expect(normalizeHotmartEvent(payload)!.subscription?.gatewaySubscriptionId).toBe("I9OT62C3");
    });
  });
});
