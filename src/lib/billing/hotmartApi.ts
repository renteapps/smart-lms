import { pickString } from "./payload";

/**
 * Cliente da API REST da Hotmart — autenticação client-credentials e listagem
 * de produtos.
 *
 * Diferente da Eduzz, a Hotmart não expõe uma conta conectada por
 * authorization-code: o painel "Ferramentas > Credenciais" entrega Client ID,
 * Client Secret e um valor "Basic" já pronto (o `base64(client_id:client_secret)`
 * calculado por eles mesmos, para poupar o desenvolvedor de montar o header à
 * mão). Os três valores em conjunto trocam por um token de acesso via
 * client-credentials — é o formulário que já existia em
 * `HotmartIntegrationContent.tsx`, só que sem nada por trás até agora.
 *
 * Endpoints confirmados: token em `api-sec-vlc.hotmart.com`, API de produto em
 * `api-hot-connect.hotmart.com`. A forma exata da resposta de listagem de
 * produto não tem um schema publicamente fixado como o da Eduzz, então a
 * leitura usa os mesmos caminhos candidatos de `payload.ts` — tolera variação
 * de formato em vez de quebrar quando a Hotmart ajustar um campo.
 */

const HOTMART_TOKEN_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token";
const HOTMART_API_BASE = "https://api-hot-connect.hotmart.com";

export class HotmartApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "HotmartApiError";
  }
}

export type HotmartAccessToken = {
  accessToken: string;
  expiresIn: number | null;
};

/**
 * A Hotmart aceita tanto Basic Auth quanto client_id/client_secret na query;
 * o painel entrega o valor "Basic" pronto, então ele é preferido quando
 * presente — reduz o que pode ser digitado errado na hora de colar.
 */
export async function getHotmartAccessToken(input: {
  clientId: string;
  clientSecret: string;
  basicToken?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<HotmartAccessToken> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 8_000);

  const url = new URL(HOTMART_TOKEN_URL);
  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("client_secret", input.clientSecret);

  const authorization = input.basicToken?.trim()
    ? (input.basicToken.trim().startsWith("Basic ") ? input.basicToken.trim() : `Basic ${input.basicToken.trim()}`)
    : `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`;

  try {
    const response = await (input.fetchImpl ?? fetch)(url.toString(), {
      method: "POST",
      headers: { Accept: "application/json", Authorization: authorization },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new HotmartApiError(
        response.status === 401 || response.status === 403
          ? "Credenciais da Hotmart recusadas. Confira Client ID, Client Secret e o token Basic."
          : `Hotmart respondeu HTTP ${response.status} ao autenticar.`,
        response.status,
      );
    }

    const payload = await response.json() as Record<string, unknown>;
    const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
    if (!accessToken) throw new HotmartApiError("Resposta de autenticação da Hotmart sem access_token.");

    return {
      accessToken,
      expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : null,
    };
  } catch (error) {
    if (error instanceof HotmartApiError) throw error;
    if ((error as Error).name === "AbortError") throw new HotmartApiError("Timeout ao autenticar na Hotmart.");
    throw new HotmartApiError(`Falha ao autenticar na Hotmart: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export type HotmartProductSummary = {
  id: string;
  name: string;
  status: string | null;
};

const PRODUCT_ID_PATHS = ["id", "product.id", "productId"] as const;
const PRODUCT_NAME_PATHS = ["name", "product.name", "productName"] as const;
const PRODUCT_STATUS_PATHS = ["status", "product.status"] as const;

export function normalizeHotmartProduct(raw: unknown): HotmartProductSummary | null {
  const id = pickString(raw, PRODUCT_ID_PATHS);
  const name = pickString(raw, PRODUCT_NAME_PATHS);
  if (!id || !name) return null;

  return { id, name, status: pickString(raw, PRODUCT_STATUS_PATHS) ?? null };
}

/**
 * Lista os produtos da conta autenticada.
 *
 * A Hotmart não documenta publicamente um endpoint de "ofertas por produto"
 * equivalente ao da Eduzz — o código de oferta (`off=` na URL de checkout) é
 * definido na página do produto e não tem uma listagem própria confirmada na
 * API pública. Por isso esta função só traz produtos; o campo de oferta no
 * mapeamento continua manual para a Hotmart, com uma nota explicando o motivo
 * na tela.
 */
export async function listHotmartProducts(input: {
  accessToken: string;
  maxResults?: number;
  fetchImpl?: typeof fetch;
}): Promise<HotmartProductSummary[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  const url = new URL(`${HOTMART_API_BASE}/product/rest/v2/products`);
  if (input.maxResults) url.searchParams.set("max_results", String(input.maxResults));

  try {
    const response = await (input.fetchImpl ?? fetch)(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${input.accessToken}` },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new HotmartApiError(`Hotmart respondeu HTTP ${response.status} ao listar produtos.`, response.status);
    }

    const payload = await response.json() as Record<string, unknown>;
    const rawItems = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.products)
        ? payload.products
        : Array.isArray(payload)
          ? payload
          : [];

    return (rawItems as unknown[])
      .map(normalizeHotmartProduct)
      .filter((item): item is HotmartProductSummary => item !== null);
  } catch (error) {
    if (error instanceof HotmartApiError) throw error;
    if ((error as Error).name === "AbortError") throw new HotmartApiError("Timeout ao listar produtos na Hotmart.");
    throw new HotmartApiError(`Falha ao listar produtos na Hotmart: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}
