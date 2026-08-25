import { describe, expect, it, vi } from "vitest";
import { EduzzApiError } from "./eduzzApi";
import { listEduzzProductOffers, listEduzzProducts, normalizeEduzzOffer, normalizeEduzzProduct } from "./eduzzProducts";

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

describe("normalizeEduzzProduct", () => {
  it("extrai id, nome, status e preço", () => {
    const produto = normalizeEduzzProduct({
      id: "47998", name: "Produto Digital Básico", status: "active",
      payment: { type: "oneTime", price: { currency: "BRL", value: 1.1 } },
    });
    expect(produto).toEqual({ id: "47998", name: "Produto Digital Básico", status: "active", priceValue: 1.1, currency: "BRL" });
  });

  it("descarta item sem id ou sem nome", () => {
    expect(normalizeEduzzProduct({ name: "Sem id" })).toBeNull();
    expect(normalizeEduzzProduct({ id: "1" })).toBeNull();
  });

  it("status ausente vira 'unknown' em vez de quebrar", () => {
    expect(normalizeEduzzProduct({ id: "1", name: "Produto" })?.status).toBe("unknown");
  });
});

describe("normalizeEduzzOffer", () => {
  it("extrai id, nome, padrão e preço da oferta", () => {
    const oferta = normalizeEduzzOffer({
      id: "off-1", name: "Oferta Principal", isDefault: true,
      checkoutUrl: "https://sun.eduzz.com/123", defaultPrice: { currency: "BRL", value: 97 },
    });
    expect(oferta).toEqual({
      id: "off-1", name: "Oferta Principal", isDefault: true,
      checkoutUrl: "https://sun.eduzz.com/123", priceValue: 97, currency: "BRL",
    });
  });

  it("nome ausente cai para o próprio id", () => {
    expect(normalizeEduzzOffer({ id: "off-2" })?.name).toBe("off-2");
  });

  it("sem id, descarta", () => {
    expect(normalizeEduzzOffer({ name: "Sem id" })).toBeNull();
  });
});

describe("listEduzzProducts", () => {
  it("monta a URL com paginação e mapeia os itens", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({
      page: 2, pages: 5, totalItems: 210,
      items: [{ id: "1", name: "A", status: "active" }, { id: "2", name: "B", status: "active" }],
    }));

    const result = await listEduzzProducts({ accessToken: "tok", page: 2, itemsPerPage: 42, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.eduzz.com/myeduzz/v1/products?page=2&itemsPerPage=42",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer tok" }) }),
    );
    expect(result).toEqual({
      page: 2, pages: 5, totalItems: 210,
      items: [{ id: "1", name: "A", status: "active", priceValue: null, currency: null }, { id: "2", name: "B", status: "active", priceValue: null, currency: null }],
    });
  });

  it("descarta silenciosamente itens malformados da resposta", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [{ id: "1", name: "Ok" }, { name: "Sem id" }, null] }));
    const result = await listEduzzProducts({ accessToken: "tok", fetchImpl });
    expect(result.items).toHaveLength(1);
  });

  it("página padrão é 1 e tamanho padrão é 50", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [] }));
    await listEduzzProducts({ accessToken: "tok", fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.eduzz.com/myeduzz/v1/products?page=1&itemsPerPage=50",
      expect.anything(),
    );
  });

  it("HTTP de erro vira EduzzApiError com o status", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ error: "unauthorized" }, 401));
    await expect(listEduzzProducts({ accessToken: "tok", fetchImpl })).rejects.toMatchObject({
      constructor: EduzzApiError, status: 401,
    });
  });
});

describe("listEduzzProductOffers", () => {
  it("aceita resposta como array direto", async () => {
    const fetchImpl = vi.fn(() => jsonResponse([{ id: "off-1", name: "Principal", isDefault: true }]));
    const offers = await listEduzzProductOffers({ accessToken: "tok", productId: "47998", fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.eduzz.com/myeduzz/v1/products/47998/offers",
      expect.anything(),
    );
    expect(offers).toEqual([{ id: "off-1", name: "Principal", isDefault: true, checkoutUrl: null, priceValue: null, currency: null }]);
  });

  it("aceita resposta envelopada em { items }", async () => {
    const fetchImpl = vi.fn(() => jsonResponse({ items: [{ id: "off-2", name: "Secundária" }] }));
    const offers = await listEduzzProductOffers({ accessToken: "tok", productId: "1", fetchImpl });
    expect(offers).toHaveLength(1);
  });

  it("codifica o id do produto na URL", async () => {
    const fetchImpl = vi.fn(() => jsonResponse([]));
    await listEduzzProductOffers({ accessToken: "tok", productId: "id com espaço", fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.eduzz.com/myeduzz/v1/products/id%20com%20espa%C3%A7o/offers",
      expect.anything(),
    );
  });
});
