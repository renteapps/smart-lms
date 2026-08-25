import { resolveHotmartOutcome } from "./eventPolicy";
import { deriveEventId, normalizeEmail, pickDate, pickNumber, pickString } from "./payload";
import type { NormalizedBillingEvent } from "./types";

/**
 * Tradução do webhook Hotmart para o formato interno.
 *
 * Cobre o formato 2.0.0 (`data.buyer`, `data.product`, `data.purchase`,
 * `data.subscription`) e os nomes equivalentes da v1, que várias contas ainda
 * usam. Datas da Hotmart vêm em epoch de milissegundos — `toIsoDate` resolve.
 */

const EMAIL_PATHS = [
  "data.buyer.email",
  "data.subscriber.email",
  "data.subscription.subscriber.email",
  "buyer.email",
  "email",
] as const;

const NAME_PATHS = [
  "data.buyer.name",
  "data.subscriber.name",
  "buyer.name",
  "name",
] as const;

const PHONE_PATHS = [
  "data.buyer.checkout_phone",
  "data.buyer.phone",
  "buyer.checkout_phone",
  "phone_checkout",
] as const;

const DOCUMENT_PATHS = [
  "data.buyer.document",
  "buyer.document",
  "doc",
] as const;

/**
 * `ucode` vem antes de `id` de propósito: é o identificador estável do produto
 * na Hotmart, enquanto `id` é numérico e reaproveitável. O mapeamento em
 * `gateway_products` aceita qualquer um dos dois — vale o que estiver cadastrado.
 */
const PRODUCT_PATHS = [
  "data.product.ucode",
  "data.product.id",
  "product.ucode",
  "prod",
] as const;

const OFFER_PATHS = [
  "data.purchase.offer.code",
  "data.purchase.offer.key",
  "data.offer.code",
  "off",
] as const;

const TRANSACTION_PATHS = [
  "data.purchase.transaction",
  "purchase.transaction",
  "transaction",
] as const;

const SUBSCRIPTION_PATHS = [
  "data.subscription.subscriber.code",
  "data.subscription.subscriber_code",
  "data.subscription.id",
  "subscriber_code",
] as const;

const AMOUNT_PATHS = [
  "data.purchase.price.value",
  "data.purchase.full_price.value",
  "purchase.price.value",
  "price",
] as const;

const CURRENCY_PATHS = [
  "data.purchase.price.currency_value",
  "data.purchase.price.currency_code",
  "currency",
] as const;

const OCCURRED_PATHS = [
  "data.purchase.approved_date",
  "data.purchase.order_date",
  "creation_date",
] as const;

const PERIOD_END_PATHS = [
  "data.purchase.date_next_charge",
  "data.subscription.date_next_charge",
  "data.purchase.subscription.date_next_charge",
] as const;

export function normalizeHotmartEvent(payload: unknown): NormalizedBillingEvent | null {
  if (!payload || typeof payload !== "object") return null;

  const eventType = pickString(payload, ["event", "event_name", "type"]);
  if (!eventType) return null;

  const email = normalizeEmail(pickString(payload, EMAIL_PATHS));
  const productId = pickString(payload, PRODUCT_PATHS);
  if (!email || !productId) return null;

  const outcome = resolveHotmartOutcome(eventType);
  const transactionId = pickString(payload, TRANSACTION_PATHS) ?? productId;

  return {
    gateway: "hotmart",
    eventId: deriveEventId({
      providedId: pickString(payload, ["id", "event_id"]),
      gateway: "hotmart",
      eventType,
      transactionId,
      status: pickString(payload, ["data.purchase.status", "status"]),
    }),
    eventType,
    action: outcome.action,
    buyer: {
      email,
      name: pickString(payload, NAME_PATHS),
      phone: pickString(payload, PHONE_PATHS),
      document: pickString(payload, DOCUMENT_PATHS),
    },
    product: {
      productId,
      offerId: pickString(payload, OFFER_PATHS),
    },
    transaction: {
      id: transactionId,
      amount: pickNumber(payload, AMOUNT_PATHS) ?? 0,
      currency: pickString(payload, CURRENCY_PATHS) ?? "BRL",
      occurredAt: pickDate(payload, OCCURRED_PATHS) ?? new Date().toISOString(),
      status: outcome.transactionStatus,
    },
    subscription: {
      gatewaySubscriptionId: pickString(payload, SUBSCRIPTION_PATHS),
      currentPeriodEnd: pickDate(payload, PERIOD_END_PATHS) ?? null,
    },
  };
}
