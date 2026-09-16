import { describe, expect, it, vi } from "vitest";
import {
  HotmartApiError,
  cancelHotmartSubscription,
  getHotmartAccessToken,
  getHotmartSubscriberSnapshot,
  listHotmartOffersForProduct,
  listHotmartProducts,
  listHotmartSubscribers,
  mergeHotmartEventWithSnapshot,
  normalizeHotmartOffer,
  normalizeHotmartProduct,
  normalizeHotmartSubscriber,
  normalizeHotmartSubscriberSnapshot,
  reactivateHotmartSubscription,
} from "./hotmartApi";
import type { NormalizedBillingEvent } from "./types";

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

describe("getHotmartAccessToken", () => {
  it("usa o token Basic fornecido pelo painel, sem recalcular", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ access_token: "abc", expires_in: 3600 }));
    const result = await getHotmartAccessToken({
      clientId: "id", clientSecret: "secret", basicToken: "Basic aGVsbG8=", fetchImpl,
    });

    expect(result).toEqual({ accessToken: "abc", expiresIn: 3600 });
    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toContain("grant_type=client_credentials");
    expect(url).toContain("client_id=id");
    expect((init.headers as Record<string, string>).Authorization).toBe("Basic aGVsbG8=");
  });

  it("aceita o valor Basic sem o prefixo e adiciona sozinho", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ access_token: "abc" }));
    await getHotmartAccessToken({ clientId: "id", clientSecret: "secret", basicToken: "aGVsbG8=", fetchImpl });
    const [, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Basic aGVsbG8=");
  });

  it("sem token Basic, calcula base64(client_id:client_secret) sozinho", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ access_token: "abc" }));
    await getHotmartAccessToken({ clientId: "meu-id", clientSecret: "meu-segredo", fetchImpl });
    const [, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    const expected = `Basic ${Buffer.from("meu-id:meu-segredo").toString("base64")}`;
    expect((init.headers as Record<string, string>).Authorization).toBe(expected);
  });

  it("401 vira mensagem de credenciais recusadas", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({}, 401));
    await expect(getHotmartAccessToken({ clientId: "id", clientSecret: "s", fetchImpl }))
      .rejects.toThrow(/recusadas/);
  });

  it("resposta sem access_token falha explicitamente", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({}));
    await expect(getHotmartAccessToken({ clientId: "id", clientSecret: "s", fetchImpl }))
      .rejects.toBeInstanceOf(HotmartApiError);
  });
});

describe("normalizeHotmartProduct", () => {
  it("lê o caminho simples id/name/status", () => {
    expect(normalizeHotmartProduct({ id: "1", name: "Curso X", status: "ACTIVE" }))
      .toEqual({ id: "1", name: "Curso X", status: "ACTIVE" });
  });

  it("lê o caminho aninhado product.id/product.name", () => {
    expect(normalizeHotmartProduct({ product: { id: "2", name: "Curso Y" } }))
      .toEqual({ id: "2", name: "Curso Y", status: null });
  });

  it("prefere ucode sobre id — é o que o webhook manda como productId", () => {
    // Formato oficial de GET /products/api/v1/products.
    expect(normalizeHotmartProduct({
      id: 698441, name: "Product A", ucode: "f2b3be1f-313f-4a2d-b5b7-1c39d67dd3ee",
      status: "DRAFT", created_at: 1586459699000, format: "EBOOK", is_subscription: false, warranty_period: 7,
    })).toEqual({ id: "f2b3be1f-313f-4a2d-b5b7-1c39d67dd3ee", name: "Product A", status: "DRAFT" });
  });

  it("sem id ou sem nome, descarta", () => {
    expect(normalizeHotmartProduct({ name: "Sem id" })).toBeNull();
    expect(normalizeHotmartProduct({ id: "1" })).toBeNull();
  });
});

describe("listHotmartProducts", () => {
  it("aceita resposta em items[]", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [{ id: "1", name: "A" }] }));
    const produtos = await listHotmartProducts({ accessToken: "tok", fetchImpl });
    expect(produtos).toEqual([{ id: "1", name: "A", status: null }]);
    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toContain("developers.hotmart.com/products/api/v1/products");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("aceita resposta em products[]", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ products: [{ id: "1", name: "A" }] }));
    expect(await listHotmartProducts({ accessToken: "tok", fetchImpl })).toHaveLength(1);
  });

  it("aceita resposta como array direto", async () => {
    const fetchImpl = vi.fn(() => jsonResponse([{ id: "1", name: "A" }]));
    expect(await listHotmartProducts({ accessToken: "tok", fetchImpl })).toHaveLength(1);
  });

  it("descarta itens malformados sem quebrar a listagem inteira", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [{ id: "1", name: "Ok" }, { name: "Sem id" }] }));
    expect(await listHotmartProducts({ accessToken: "tok", fetchImpl })).toHaveLength(1);
  });

  it("HTTP de erro vira HotmartApiError com o status", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({}, 500));
    await expect(listHotmartProducts({ accessToken: "tok", fetchImpl }))
      .rejects.toMatchObject({ status: 500 });
  });
});

describe("normalizeHotmartOffer / listHotmartOffersForProduct", () => {
  // Exemplo oficial da documentação (GET /products/api/v1/products/:ucode/offers).
  const offerPayload = {
    is_currency_conversion_enabled: true, is_main_offer: true, is_smart_recovery_enabled: false,
    price: { value: 10, currency_code: "BRL" }, code: "02mhofjd", description: "", name: "", payment_mode: "PAY_IN_FULL",
  };

  it("normaliza o payload oficial", () => {
    expect(normalizeHotmartOffer(offerPayload)).toEqual({
      code: "02mhofjd", name: null, description: null, priceValue: 10, currencyCode: "BRL",
      paymentMode: "PAY_IN_FULL", isMainOffer: true,
    });
  });

  it("sem code, descarta", () => {
    expect(normalizeHotmartOffer({ name: "Sem código" })).toBeNull();
  });

  it("busca por ucode no path certo", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [offerPayload] }));
    const offers = await listHotmartOffersForProduct({ accessToken: "tok", productUcode: "f2b3be1f-313f", fetchImpl });

    expect(offers).toEqual([{
      code: "02mhofjd", name: null, description: null, priceValue: 10, currencyCode: "BRL",
      paymentMode: "PAY_IN_FULL", isMainOffer: true,
    }]);
    const [url] = fetchImpl.mock.calls[0]! as unknown as [string];
    expect(url).toBe("https://developers.hotmart.com/products/api/v1/products/f2b3be1f-313f/offers");
  });

  it("HTTP de erro vira HotmartApiError com o status", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({}, 404));
    await expect(listHotmartOffersForProduct({ accessToken: "tok", productUcode: "x", fetchImpl }))
      .rejects.toMatchObject({ status: 404 });
  });
});

// Exemplo oficial da documentação (GET /payments/api/v1/subscriptions).
const subscriberPayload = {
  subscriber_code: "ABC12DEF",
  subscription_id: 123456,
  status: "ACTIVE",
  accession_date: 1577847600000,
  end_accession_date: 1641005999000,
  date_next_charge: 1580558059000,
  trial: false,
  transaction: "HP16616613605324",
  plan: { name: "Plan name", id: 726420, recurrency_period: 30, max_charge_cycles: 6 },
  product: { id: 123456, name: "Product Name", ucode: "12a34bcd-56e7-4847-fg89-h1i23j4567l8" },
  price: { value: 123.45, currency_code: "BRL" },
  subscriber: { name: "Subscriber name", email: "subscriber@email.com.br", ucode: "10a98bcd-76e5-4321-fg09-h8i76j5432l1" },
};

describe("normalizeHotmartSubscriber", () => {
  it("normaliza o payload oficial completo", () => {
    expect(normalizeHotmartSubscriber(subscriberPayload)).toMatchObject({
      subscriberCode: "ABC12DEF",
      subscriptionId: 123456,
      status: "ACTIVE",
      trial: false,
      transaction: "HP16616613605324",
      plan: { id: "726420", name: "Plan name", recurrencyPeriod: 30, maxChargeCycles: 6 },
      // ucode tem precedência sobre id — mesmo critério do normalizador de webhook.
      product: { id: "12a34bcd-56e7-4847-fg89-h1i23j4567l8", name: "Product Name" },
      price: { value: 123.45, currencyCode: "BRL" },
      subscriber: { name: "Subscriber name", email: "subscriber@email.com.br" },
    });
  });

  it("sem subscriber_code ou status, descarta", () => {
    expect(normalizeHotmartSubscriber({ status: "ACTIVE" })).toBeNull();
    expect(normalizeHotmartSubscriber({ subscriber_code: "X" })).toBeNull();
  });
});

describe("listHotmartSubscribers", () => {
  it("monta a query string com os filtros e devolve items + page_info", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({
      items: [subscriberPayload],
      page_info: { total_results: 30, next_page_token: "next-tok", prev_page_token: "prev-tok", results_per_page: 10 },
    }));

    const page = await listHotmartSubscribers({
      accessToken: "tok", status: "ACTIVE", productId: "123456", subscriberEmail: "a@b.com", pageToken: "cursor-1", fetchImpl,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.subscriberCode).toBe("ABC12DEF");
    expect(page.pageInfo).toEqual({ totalResults: 30, nextPageToken: "next-tok", prevPageToken: "prev-tok", resultsPerPage: 10 });

    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toContain("developers.hotmart.com/payments/api/v1/subscriptions");
    expect(url).toContain("status=ACTIVE");
    expect(url).toContain("product_id=123456");
    expect(url).toContain("page_token=cursor-1");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("descarta itens malformados sem quebrar a listagem", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [subscriberPayload, { status: "ACTIVE" }] }));
    const page = await listHotmartSubscribers({ accessToken: "tok", fetchImpl });
    expect(page.items).toHaveLength(1);
  });

  it("HTTP de erro vira HotmartApiError com o status", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({}, 500));
    await expect(listHotmartSubscribers({ accessToken: "tok", fetchImpl })).rejects.toMatchObject({ status: 500 });
  });
});

describe("cancelHotmartSubscription / reactivateHotmartSubscription", () => {
  it("cancela com send_mail no corpo e POST no path certo", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ status: "INACTIVE", subscriber_code: "9W2LNSG2" }));
    const result = await cancelHotmartSubscription({ accessToken: "tok", subscriberCode: "9W2LNSG2", sendMail: true, fetchImpl });

    expect(result).toEqual({ status: "INACTIVE", subscriberCode: "9W2LNSG2" });
    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://developers.hotmart.com/payments/api/v1/subscriptions/9W2LNSG2/cancel");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ send_mail: true });
  });

  it("reativa com charge:false por padrão", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ status: "INACTIVE", subscriber_code: "9W2LNSG2" }));
    await reactivateHotmartSubscription({ accessToken: "tok", subscriberCode: "9W2LNSG2", fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://developers.hotmart.com/payments/api/v1/subscriptions/9W2LNSG2/reactivate");
    expect(JSON.parse(init.body as string)).toEqual({ charge: false });
  });

  it("HTTP de erro vira HotmartApiError com o status", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({}, 404));
    await expect(cancelHotmartSubscription({ accessToken: "tok", subscriberCode: "X", fetchImpl }))
      .rejects.toMatchObject({ status: 404 });
  });
});

describe("getHotmartSubscriberSnapshot / normalizeHotmartSubscriberSnapshot", () => {
  it("busca por subscriber_code e normaliza o snapshot", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [subscriberPayload], page_info: {} }));
    const snapshot = await getHotmartSubscriberSnapshot({ accessToken: "tok", subscriberCode: "ABC12DEF", fetchImpl });

    expect(snapshot).toMatchObject({
      id: "ABC12DEF", gatewayStatus: "ACTIVE", localStatus: "active",
      buyer: { email: "subscriber@email.com.br", name: "Subscriber name" },
      product: { productId: "12a34bcd-56e7-4847-fg89-h1i23j4567l8" },
      amount: 123.45, currency: "BRL",
    });
    const [url] = fetchImpl.mock.calls[0]! as unknown as [string];
    expect(url).toContain("subscriber_code=ABC12DEF");
  });

  it("assinante não encontrado falha explicitamente", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [] }));
    await expect(getHotmartSubscriberSnapshot({ accessToken: "tok", subscriberCode: "X", fetchImpl }))
      .rejects.toBeInstanceOf(HotmartApiError);
  });

  it("status desconhecido falha em vez de assumir um padrão", () => {
    const summary = normalizeHotmartSubscriber({ ...subscriberPayload, status: "SEI_LA" })!;
    expect(() => normalizeHotmartSubscriberSnapshot(summary)).toThrow(/desconhecido/);
  });
});

describe("mergeHotmartEventWithSnapshot", () => {
  it("a API prevalece sobre o payload do webhook", () => {
    const summary = normalizeHotmartSubscriber({ ...subscriberPayload, status: "CANCELLED_BY_CUSTOMER" })!;
    const snapshot = normalizeHotmartSubscriberSnapshot(summary);
    const event: NormalizedBillingEvent = {
      gateway: "hotmart", eventId: "e1", eventType: "PURCHASE_APPROVED", action: "grant",
      buyer: { email: "antigo@exemplo.com" }, product: { productId: "old" },
      subscription: { gatewaySubscriptionId: "ABC12DEF", gatewayStatus: "ACTIVE", localStatus: "active" },
    };

    const merged = mergeHotmartEventWithSnapshot(event, snapshot);
    expect(merged.action).toBe("revoke_at_period_end");
    expect(merged.buyer?.email).toBe("subscriber@email.com.br");
    expect(merged.product?.productId).toBe("12a34bcd-56e7-4847-fg89-h1i23j4567l8");
    expect(merged.subscription?.localStatus).toBe("canceled");
  });
});
