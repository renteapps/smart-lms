import { resolveHotmartSubscriptionStatus } from "./eventPolicy";
import { pickBoolean, pickDate, pickNumber, pickString } from "./payload";
import type { HotmartSubscriptionSnapshot, HotmartSubscriptionStatus, NormalizedBillingEvent } from "./types";

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
/** Host confirmado na documentação para a Subscription API — diferente do host de produto acima. */
const HOTMART_PAYMENTS_API_BASE = "https://developers.hotmart.com";

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

/**
 * Cliente da Subscription API (`/payments/api/v1/subscriptions*`) — listagem de
 * assinantes, cancelamento e reativação. Ao contrário da listagem de produtos,
 * esta é uma API com schema publicamente documentado e estável, então os
 * normalizadores abaixo leem caminhos únicos em vez de candidatos múltiplos.
 */

const SUBSCRIBER_PATHS = {
  subscriberCode: ["subscriber_code"],
  subscriptionId: ["subscription_id"],
  status: ["status"],
  accessionDate: ["accession_date"],
  endAccessionDate: ["end_accession_date"],
  dateNextCharge: ["date_next_charge"],
  trial: ["trial"],
  transaction: ["transaction"],
  planId: ["plan.id"],
  planName: ["plan.name"],
  planRecurrencyPeriod: ["plan.recurrency_period"],
  planMaxChargeCycles: ["plan.max_charge_cycles"],
  // `ucode` primeiro: é o identificador estável do produto na Hotmart, o mesmo
  // critério já usado em `lib/billing/hotmart.ts` para o webhook — mantém o
  // mapeamento em `gateway_products` funcionando com o mesmo valor.
  productId: ["product.ucode", "product.id"],
  productName: ["product.name"],
  priceValue: ["price.value"],
  priceCurrency: ["price.currency_code"],
  subscriberName: ["subscriber.name"],
  subscriberEmail: ["subscriber.email"],
} as const;

export type HotmartSubscriberSummary = {
  subscriberCode: string;
  subscriptionId: number | null;
  status: string;
  accessionDate: string | null;
  endAccessionDate: string | null;
  dateNextCharge: string | null;
  trial: boolean;
  transaction: string | null;
  plan: { id: string | null; name: string | null; recurrencyPeriod: number | null; maxChargeCycles: number | null } | null;
  product: { id: string | null; name: string | null } | null;
  price: { value: number | null; currencyCode: string | null } | null;
  subscriber: { name: string | null; email: string | null } | null;
};

export function normalizeHotmartSubscriber(raw: unknown): HotmartSubscriberSummary | null {
  const subscriberCode = pickString(raw, SUBSCRIBER_PATHS.subscriberCode);
  const status = pickString(raw, SUBSCRIBER_PATHS.status);
  if (!subscriberCode || !status) return null;

  const planId = pickString(raw, SUBSCRIBER_PATHS.planId);
  const planName = pickString(raw, SUBSCRIBER_PATHS.planName);
  const productId = pickString(raw, SUBSCRIBER_PATHS.productId);
  const productName = pickString(raw, SUBSCRIBER_PATHS.productName);
  const subscriberName = pickString(raw, SUBSCRIBER_PATHS.subscriberName);
  const subscriberEmail = pickString(raw, SUBSCRIBER_PATHS.subscriberEmail);
  const priceValue = pickNumber(raw, SUBSCRIBER_PATHS.priceValue);
  const priceCurrency = pickString(raw, SUBSCRIBER_PATHS.priceCurrency);

  return {
    subscriberCode,
    subscriptionId: pickNumber(raw, SUBSCRIBER_PATHS.subscriptionId) ?? null,
    status,
    accessionDate: pickDate(raw, SUBSCRIBER_PATHS.accessionDate) ?? null,
    endAccessionDate: pickDate(raw, SUBSCRIBER_PATHS.endAccessionDate) ?? null,
    dateNextCharge: pickDate(raw, SUBSCRIBER_PATHS.dateNextCharge) ?? null,
    trial: pickBoolean(raw, SUBSCRIBER_PATHS.trial) ?? false,
    transaction: pickString(raw, SUBSCRIBER_PATHS.transaction) ?? null,
    plan: planId || planName
      ? {
        id: planId ?? null, name: planName ?? null,
        recurrencyPeriod: pickNumber(raw, SUBSCRIBER_PATHS.planRecurrencyPeriod) ?? null,
        maxChargeCycles: pickNumber(raw, SUBSCRIBER_PATHS.planMaxChargeCycles) ?? null,
      }
      : null,
    product: productId || productName ? { id: productId ?? null, name: productName ?? null } : null,
    price: priceValue != null || priceCurrency ? { value: priceValue ?? null, currencyCode: priceCurrency ?? null } : null,
    subscriber: subscriberName || subscriberEmail ? { name: subscriberName ?? null, email: subscriberEmail ?? null } : null,
  };
}

export type HotmartSubscriberPageInfo = {
  totalResults: number | null;
  nextPageToken: string | null;
  prevPageToken: string | null;
  resultsPerPage: number | null;
};

export type HotmartSubscriberPage = {
  items: HotmartSubscriberSummary[];
  pageInfo: HotmartSubscriberPageInfo;
};

export async function listHotmartSubscribers(input: {
  accessToken: string;
  status?: string;
  productId?: string;
  subscriberEmail?: string;
  subscriberCode?: string;
  pageToken?: string;
  maxResults?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<HotmartSubscriberPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 8_000);

  const url = new URL(`${HOTMART_PAYMENTS_API_BASE}/payments/api/v1/subscriptions`);
  if (input.status) url.searchParams.set("status", input.status);
  if (input.productId) url.searchParams.set("product_id", input.productId);
  if (input.subscriberEmail) url.searchParams.set("subscriber_email", input.subscriberEmail);
  if (input.subscriberCode) url.searchParams.set("subscriber_code", input.subscriberCode);
  if (input.pageToken) url.searchParams.set("page_token", input.pageToken);
  if (input.maxResults) url.searchParams.set("max_results", String(input.maxResults));

  try {
    const response = await (input.fetchImpl ?? fetch)(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${input.accessToken}` },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new HotmartApiError(`Hotmart respondeu HTTP ${response.status} ao listar assinaturas.`, response.status);
    }

    const payload = await response.json() as Record<string, unknown>;
    const items = (Array.isArray(payload.items) ? payload.items : [])
      .map(normalizeHotmartSubscriber)
      .filter((item): item is HotmartSubscriberSummary => item !== null);

    return {
      items,
      pageInfo: {
        totalResults: pickNumber(payload.page_info, ["total_results"]) ?? null,
        nextPageToken: pickString(payload.page_info, ["next_page_token"]) ?? null,
        prevPageToken: pickString(payload.page_info, ["prev_page_token"]) ?? null,
        resultsPerPage: pickNumber(payload.page_info, ["results_per_page"]) ?? null,
      },
    };
  } catch (error) {
    if (error instanceof HotmartApiError) throw error;
    if ((error as Error).name === "AbortError") throw new HotmartApiError("Timeout ao listar assinaturas na Hotmart.");
    throw new HotmartApiError(`Falha ao listar assinaturas na Hotmart: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function postSubscriberAction(input: {
  accessToken: string;
  subscriberCode: string;
  action: "cancel" | "reactivate";
  body: Record<string, boolean>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<{ status: string; subscriberCode: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 8_000);

  try {
    const response = await (input.fetchImpl ?? fetch)(
      `${HOTMART_PAYMENTS_API_BASE}/payments/api/v1/subscriptions/${encodeURIComponent(input.subscriberCode)}/${input.action}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json", "Content-Type": "application/json",
          Authorization: `Bearer ${input.accessToken}`,
        },
        body: JSON.stringify(input.body),
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new HotmartApiError(
        `Hotmart respondeu HTTP ${response.status} ao ${input.action === "cancel" ? "cancelar" : "reativar"} a assinatura.`,
        response.status,
      );
    }

    const payload = await response.json() as Record<string, unknown>;
    const status = pickString(payload, ["status"]);
    const subscriberCode = pickString(payload, ["subscriber_code"]) ?? input.subscriberCode;
    if (!status) throw new HotmartApiError("Resposta sem status ao processar a assinatura.");
    return { status, subscriberCode };
  } catch (error) {
    if (error instanceof HotmartApiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new HotmartApiError(`Timeout ao ${input.action === "cancel" ? "cancelar" : "reativar"} a assinatura na Hotmart.`);
    }
    throw new HotmartApiError(`Falha ao ${input.action === "cancel" ? "cancelar" : "reativar"} a assinatura: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

/** `send_mail: true` por padrão — o comprador sabe que a cobrança recorrente parou. */
export function cancelHotmartSubscription(input: {
  accessToken: string; subscriberCode: string; sendMail?: boolean; timeoutMs?: number; fetchImpl?: typeof fetch;
}) {
  return postSubscriberAction({
    ...input, action: "cancel", body: { send_mail: input.sendMail ?? true },
  });
}

/**
 * Reativação **não é imediata**: a Hotmart manda um e-mail de aceite ao
 * assinante (válido por 3 dias) e só reativa quando ele aceitar. O retorno
 * desta chamada ainda traz `status: "INACTIVE"` — não trate como sucesso
 * imediato de acesso.
 */
export function reactivateHotmartSubscription(input: {
  accessToken: string; subscriberCode: string; charge?: boolean; timeoutMs?: number; fetchImpl?: typeof fetch;
}) {
  return postSubscriberAction({
    ...input, action: "reactivate", body: { charge: input.charge ?? false },
  });
}

/**
 * Não existe endpoint de "buscar 1 assinante" na Hotmart — o jeito é filtrar a
 * listagem por `subscriber_code` e pegar o primeiro item. Usado tanto para
 * reconciliar depois de cancelar/reativar quanto para o enrich do webhook.
 */
export async function getHotmartSubscriberSnapshot(input: {
  accessToken: string; subscriberCode: string; timeoutMs?: number; fetchImpl?: typeof fetch;
}): Promise<HotmartSubscriptionSnapshot> {
  const page = await listHotmartSubscribers({
    accessToken: input.accessToken, subscriberCode: input.subscriberCode,
    timeoutMs: input.timeoutMs, fetchImpl: input.fetchImpl,
  });
  const item = page.items.find((entry) => entry.subscriberCode === input.subscriberCode) ?? page.items[0];
  if (!item) throw new HotmartApiError(`Assinante ${input.subscriberCode} não encontrado na Hotmart.`);
  return normalizeHotmartSubscriberSnapshot(item);
}

export function normalizeHotmartSubscriberSnapshot(summary: HotmartSubscriberSummary): HotmartSubscriptionSnapshot {
  const outcome = resolveHotmartSubscriptionStatus(summary.status);
  if (!outcome.localStatus) throw new HotmartApiError(`Status de assinatura desconhecido: ${summary.status}.`);

  return {
    id: summary.subscriberCode,
    gatewayStatus: summary.status as HotmartSubscriptionStatus,
    localStatus: outcome.localStatus,
    nextDueAt: summary.dateNextCharge,
    buyer: summary.subscriber?.email
      ? { email: summary.subscriber.email, name: summary.subscriber.name ?? undefined }
      : undefined,
    product: summary.product?.id ? { productId: summary.product.id } : undefined,
    amount: summary.price?.value ?? undefined,
    currency: summary.price?.currencyCode ?? undefined,
    recurrence: summary.plan
      ? { value: summary.plan.recurrencyPeriod ?? undefined, nextDueAt: summary.dateNextCharge }
      : undefined,
  };
}

/** A API prevalece sobre o payload do webhook — mesmo papel de `mergeEduzzEventWithSnapshot`. */
export function mergeHotmartEventWithSnapshot(
  event: NormalizedBillingEvent,
  snapshot: HotmartSubscriptionSnapshot,
): NormalizedBillingEvent {
  const outcome = resolveHotmartSubscriptionStatus(snapshot.gatewayStatus);
  return {
    ...event,
    action: outcome.action,
    buyer: snapshot.buyer ?? event.buyer,
    product: snapshot.product ?? event.product,
    subscription: {
      ...event.subscription,
      gatewaySubscriptionId: snapshot.id,
      currentPeriodEnd: snapshot.nextDueAt ?? event.subscription?.currentPeriodEnd ?? null,
      gatewayStatus: snapshot.gatewayStatus,
      localStatus: snapshot.localStatus,
      amount: snapshot.amount ?? event.subscription?.amount,
      currency: snapshot.currency ?? event.subscription?.currency,
      recurrence: snapshot.recurrence ?? event.subscription?.recurrence,
    },
  };
}
