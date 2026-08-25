import { describe, expect, it, vi } from "vitest";
import { HotmartApiError, getHotmartAccessToken, listHotmartProducts, normalizeHotmartProduct } from "./hotmartApi";

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
    expect(url).toContain("api-hot-connect.hotmart.com/product/rest/v2/products");
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
