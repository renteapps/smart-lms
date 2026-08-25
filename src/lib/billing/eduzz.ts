import { resolveEduzzOutcome } from "./eventPolicy";
import { deriveEventId, normalizeEmail, pickBoolean, pickDate, pickNumber, pickString } from "./payload";
import type { NormalizedBillingEvent } from "./types";

/**
 * Tradução do webhook MyEduzz para o formato interno.
 *
 * Os caminhos abaixo cobrem o formato documentado do MyEduzz (`data.customer`,
 * `data.contract`, `data.products[]`, `data.invoice`) e também o formato antigo
 * de "notificação" com campos `cus_*`/`trans_*`, que contas mais velhas ainda
 * disparam. Ver `payload.ts` para o porquê da leitura por lista de caminhos.
 */

const EMAIL_PATHS = [
  "data.customer.email",
  "data.buyer.email",
  "data.client.email",
  "customer.email",
  "cus_email",
] as const;

const NAME_PATHS = [
  "data.customer.name",
  "data.buyer.name",
  "customer.name",
  "cus_name",
] as const;

const PHONE_PATHS = [
  "data.customer.telephone",
  "data.customer.cel",
  "data.buyer.phone",
  "customer.telephone",
  "cus_tel",
  "cus_cel",
] as const;

const DOCUMENT_PATHS = [
  "data.customer.document",
  "data.customer.taxNumber",
  "customer.document",
  "cus_taxnumber",
] as const;

const PRODUCT_PATHS = [
  "data.products.0.id",
  "data.product.id",
  "data.items.0.id",
  "product_cod",
] as const;

const OFFER_PATHS = [
  "data.products.0.offerId",
  "data.products.0.coupon",
  "data.product.offerId",
  "data.contract.offerId",
  "data.offer.id",
] as const;

const CONTRACT_PATHS = [
  "data.contract.id",
  "data.subscription.id",
  "contract.id",
] as const;

const TRANSACTION_PATHS = [
  "data.invoice.id",
  "data.sale.id",
  "data.transaction.id",
  "trans_cod",
] as const;

const AMOUNT_PATHS = [
  "data.invoice.paidAmount",
  "data.invoice.amount",
  "data.contract.paidAmount",
  "data.contract.recurrence.price.value",
  "data.products.0.price.value",
  "data.sale.paidAmount",
  "trans_value",
] as const;

const OCCURRED_PATHS = [
  "data.invoice.paidAt",
  "data.invoice.createdAt",
  "data.contract.startDate",
  "data.contract.recurrence.startsAt",
  "data.contract.createdAt",
  "data.sentDate",
  "sentDate",
  "sentAt",
  "createdAt",
] as const;

const PERIOD_END_PATHS = [
  "data.contract.nextDueDate",
  "data.contract.nextDue",
  "data.contract.recurrence.nextDue",
  "data.contract.recurrence.nextDueDate",
  "data.invoice.dueDate",
  "data.subscription.nextDueDate",
] as const;

const ACCESS_REMOVAL_PATHS = [
  "data.contract.contentAccess.accessExpirationDate",
  "data.contract.interruption.removeAccessDate",
  "data.interruption.removeAccessDate",
] as const;

const INVOICE_STATUS_PATHS = [
  "data.invoice.status",
  "data.contract.status",
  "data.status",
  "trans_status",
] as const;

export function normalizeEduzzEvent(payload: unknown): NormalizedBillingEvent | null {
  if (!payload || typeof payload !== "object") return null;

  const eventType = pickString(payload, ["event", "event_name", "type"]);
  if (!eventType) return null;

  const email = normalizeEmail(pickString(payload, EMAIL_PATHS));
  const productId = pickString(payload, PRODUCT_PATHS);
  const contractId = pickString(payload, CONTRACT_PATHS);

  // Contratos oficiais podem ser sincronizados pela API mesmo quando comprador
  // ou produto não vierem; eventos legados sem contrato ainda precisam dos dois.
  if ((!email || !productId) && !contractId) return null;

  const normalizedEventType = eventType.trim().toLowerCase();
  const invoiceStatus = normalizedEventType === "myeduzz.contract_created" || normalizedEventType === "myeduzz.contract_updated"
    ? pickString(payload, ["data.contract.status", "data.status"])
    : pickString(payload, INVOICE_STATUS_PATHS);
  const outcome = resolveEduzzOutcome(eventType, invoiceStatus);

  const transactionId = pickString(payload, TRANSACTION_PATHS);
  const phone = pickString(payload, PHONE_PATHS) ?? composeOfficialPhone(payload);
  const sentAt = pickDate(payload, ["data.sentDate", "sentDate", "sentAt", "createdAt"]);
  const updatedAt = pickDate(payload, ["data.contract.updatedAt", "data.updatedAt", "data.sentDate", "sentDate", "sentAt"]);

  const buyer = email ? {
    email,
    name: pickString(payload, NAME_PATHS),
    phone,
    document: pickString(payload, DOCUMENT_PATHS),
  } : undefined;

  const product = productId ? {
    productId,
    offerId: pickString(payload, OFFER_PATHS),
  } : undefined;

  return {
    gateway: "eduzz",
    eventId: deriveEventId({
      providedId: pickString(payload, ["id", "eventId", "data.eventId"]),
      gateway: "eduzz",
      eventType,
      transactionId: transactionId ?? contractId,
      status: invoiceStatus,
    }),
    eventType,
    sentAt,
    producerId: pickString(payload, ["data.producer.id", "producer.id", "producerId"]),
    action: outcome.action,
    buyer,
    product,
    transaction: transactionId ? {
      id: transactionId,
      amount: pickNumber(payload, AMOUNT_PATHS) ?? 0,
      currency: pickString(payload, [
        "data.invoice.currency",
        "data.contract.recurrence.price.currency",
        "data.products.0.price.currency",
        "data.currency",
      ]) ?? "BRL",
      occurredAt: pickDate(payload, OCCURRED_PATHS) ?? sentAt ?? new Date().toISOString(),
      status: outcome.transactionStatus,
    } : undefined,
    subscription: {
      gatewaySubscriptionId: contractId,
      currentPeriodEnd: pickDate(payload, PERIOD_END_PATHS) ?? null,
      gatewayStatus: invoiceStatus,
      localStatus: outcome.localStatus,
      updatedAt,
      accessRemovalAt: pickDate(payload, ACCESS_REMOVAL_PATHS) ?? null,
      removeOnLatePayment: pickBoolean(payload, ["data.contract.contentAccess.removeOnLatePayment"]),
      removeOnContractEnd: pickBoolean(payload, ["data.contract.contentAccess.removeOnContractEnd"]),
      reason: pickString(payload, ["data.reason", "reason"]),
      amount: pickNumber(payload, ["data.contract.recurrence.price.value", "data.products.0.price.value"]),
      currency: pickString(payload, ["data.contract.recurrence.price.currency", "data.products.0.price.currency"]) ?? "BRL",
      recurrence: {
        type: pickString(payload, ["data.contract.recurrence.frequency.type"]),
        value: pickNumber(payload, ["data.contract.recurrence.frequency.value"]),
        nextDueAt: pickDate(payload, PERIOD_END_PATHS) ?? null,
      },
    },
  };
}

function composeOfficialPhone(payload: unknown): string | undefined {
  const country = pickString(payload, ["data.customer.phone.countryCode", "data.financialResponsible.phone.countryCode"]);
  const area = pickString(payload, ["data.customer.phone.areaCode", "data.financialResponsible.phone.areaCode"]);
  const number = pickString(payload, ["data.customer.phone.number", "data.financialResponsible.phone.number"]);
  const joined = [country, area, number].filter(Boolean).join("");
  return joined || undefined;
}
