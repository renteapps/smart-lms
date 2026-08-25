import { EduzzApiError } from "./eduzzApi";
import { pickNumber, pickString } from "./payload";

/**
 * Catálogo de produtos e ofertas da MyEduzz — a peça que faltava para o
 * mapeamento `gateway_products` deixar de exigir digitar ID de produto de
 * cabeça. Endpoints confirmados na documentação oficial:
 *
 *   GET /myeduzz/v1/products             (paginado)
 *   GET /myeduzz/v1/products/:id/offers
 *
 * Usa o mesmo `accessToken` OAuth que `eduzzApi.ts` já usa para consultar
 * assinatura — o escopo `myeduzz_subscriptions_read` cobre autenticação, mas a
 * leitura de produto pede o token da mesma conta conectada; não há escopo
 * adicional a pedir no fluxo de OAuth existente.
 */

const EDUZZ_API_BASE = "https://api.eduzz.com";

export type EduzzProductSummary = {
  id: string;
  name: string;
  status: string;
  priceValue: number | null;
  currency: string | null;
};

export type EduzzProductPage = {
  items: EduzzProductSummary[];
  page: number;
  pages: number;
  totalItems: number;
};

export type EduzzOfferSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  checkoutUrl: string | null;
  priceValue: number | null;
  currency: string | null;
};

async function eduzzGet(
  path: string,
  input: { accessToken: string; timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 8_000);

  try {
    const response = await (input.fetchImpl ?? fetch)(`${EDUZZ_API_BASE}${path}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${input.accessToken}` },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new EduzzApiError(`Eduzz respondeu HTTP ${response.status} para ${path}.`, response.status);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof EduzzApiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new EduzzApiError(`Timeout ao consultar a Eduzz (${path}).`);
    }
    throw new EduzzApiError(`Falha ao consultar a Eduzz: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeEduzzProduct(raw: unknown): EduzzProductSummary | null {
  const id = pickString(raw, ["id"]);
  const name = pickString(raw, ["name"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    status: pickString(raw, ["status"]) ?? "unknown",
    priceValue: pickNumber(raw, ["payment.price.value"]) ?? null,
    currency: pickString(raw, ["payment.price.currency"]) ?? null,
  };
}

export function normalizeEduzzOffer(raw: unknown): EduzzOfferSummary | null {
  const id = pickString(raw, ["id"]);
  if (!id) return null;

  return {
    id,
    name: pickString(raw, ["name"]) ?? id,
    isDefault: raw !== null && typeof raw === "object" && (raw as Record<string, unknown>).isDefault === true,
    checkoutUrl: pickString(raw, ["checkoutUrl"]) ?? null,
    priceValue: pickNumber(raw, ["defaultPrice.value"]) ?? null,
    currency: pickString(raw, ["defaultPrice.currency"]) ?? null,
  };
}

/**
 * Lista os produtos cadastrados na conta conectada.
 *
 * `itemsPerPage` fica em 50 por padrão: o suficiente para a maioria das
 * contas caberem numa página só, sem puxar o catálogo inteiro de quem vende
 * centenas de produtos de uma vez.
 */
export async function listEduzzProducts(input: {
  accessToken: string;
  page?: number;
  itemsPerPage?: number;
  fetchImpl?: typeof fetch;
}): Promise<EduzzProductPage> {
  const page = input.page && input.page > 0 ? input.page : 1;
  const itemsPerPage = input.itemsPerPage && input.itemsPerPage > 0 ? input.itemsPerPage : 50;

  const payload = await eduzzGet(`/myeduzz/v1/products?page=${page}&itemsPerPage=${itemsPerPage}`, input);
  const record = (payload ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(record.items) ? record.items : [];

  return {
    items: rawItems.map(normalizeEduzzProduct).filter((item): item is EduzzProductSummary => item !== null),
    page: typeof record.page === "number" ? record.page : page,
    pages: typeof record.pages === "number" ? record.pages : 1,
    totalItems: typeof record.totalItems === "number" ? record.totalItems : rawItems.length,
  };
}

/** Ofertas cadastradas para um produto — o que popula o campo "oferta" do mapeamento. */
export async function listEduzzProductOffers(input: {
  accessToken: string;
  productId: string;
  fetchImpl?: typeof fetch;
}): Promise<EduzzOfferSummary[]> {
  const payload = await eduzzGet(`/myeduzz/v1/products/${encodeURIComponent(input.productId)}/offers`, input);
  const rawItems = Array.isArray(payload) ? payload : Array.isArray((payload as Record<string, unknown>)?.items)
    ? (payload as Record<string, unknown>).items as unknown[]
    : [];

  return rawItems.map(normalizeEduzzOffer).filter((item): item is EduzzOfferSummary => item !== null);
}
