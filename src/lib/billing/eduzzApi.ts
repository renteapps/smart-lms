import { normalizeEmail, pickDate, pickNumber, pickString } from "./payload";
import { resolveEduzzContractStatus } from "./eventPolicy";
import type { EduzzSubscriptionSnapshot, NormalizedBillingEvent } from "./types";

const EDUZZ_API_BASE = "https://api.eduzz.com";

export class EduzzApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "EduzzApiError";
  }
}

export async function getEduzzSubscriptionSnapshot(input: {
  accessToken: string;
  subscriptionId: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<EduzzSubscriptionSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 5_000);

  try {
    const response = await (input.fetchImpl ?? fetch)(
      `${EDUZZ_API_BASE}/myeduzz/v1/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${input.accessToken}`,
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new EduzzApiError(`Eduzz respondeu HTTP ${response.status}.`, response.status);
    }

    const payload: unknown = await response.json();
    return normalizeEduzzSubscriptionSnapshot(payload);
  } catch (error) {
    if (error instanceof EduzzApiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new EduzzApiError("Timeout ao consultar a assinatura na Eduzz.");
    }
    throw new EduzzApiError(`Falha ao consultar a Eduzz: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeEduzzSubscriptionSnapshot(payload: unknown): EduzzSubscriptionSnapshot {
  if (!payload || typeof payload !== "object") {
    throw new EduzzApiError("Resposta de assinatura inválida.");
  }

  const id = pickString(payload, ["id"]);
  const gatewayStatus = pickString(payload, ["status"]);
  if (!id || !gatewayStatus) {
    throw new EduzzApiError("Resposta de assinatura sem id ou status.");
  }

  const outcome = resolveEduzzContractStatus(gatewayStatus);
  if (!outcome.localStatus) {
    throw new EduzzApiError(`Status de assinatura desconhecido: ${gatewayStatus}.`);
  }

  const email = normalizeEmail(pickString(payload, ["client.email"]));
  const phoneParts = [
    pickString(payload, ["client.phone.countryCode"]),
    pickString(payload, ["client.phone.areaCode"]),
    pickString(payload, ["client.phone.number"]),
  ].filter(Boolean).join("");
  const productId = pickString(payload, ["products.0.id"]);

  return {
    id,
    gatewayStatus,
    localStatus: outcome.localStatus,
    updatedAt: pickDate(payload, ["updatedAt"]),
    nextDueAt: pickDate(payload, ["recurrence.nextDueDate", "recurrence.nextDue"]) ?? null,
    recurrence: {
      type: pickString(payload, ["recurrence.frequency.type"]),
      value: pickNumber(payload, ["recurrence.frequency.value"]),
      nextDueAt: pickDate(payload, ["recurrence.nextDueDate", "recurrence.nextDue"]) ?? null,
    },
    accessRemovalAt: pickDate(payload, ["interruption.removeAccessDate"]) ?? null,
    reason: pickString(payload, ["interruption.reason"]),
    buyer: email ? {
      email,
      name: pickString(payload, ["client.name"]),
      phone: phoneParts || undefined,
    } : undefined,
    product: productId ? { productId } : undefined,
    amount: pickNumber(payload, ["payment.price.value"]),
    currency: pickString(payload, ["payment.price.currency"]) ?? "BRL",
  };
}

export function mergeEduzzEventWithSnapshot(
  event: NormalizedBillingEvent,
  snapshot: EduzzSubscriptionSnapshot,
): NormalizedBillingEvent {
  const outcome = resolveEduzzContractStatus(snapshot.gatewayStatus);
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
      updatedAt: snapshot.updatedAt ?? event.subscription?.updatedAt,
      accessRemovalAt: snapshot.accessRemovalAt ?? event.subscription?.accessRemovalAt ?? null,
      reason: snapshot.reason ?? event.subscription?.reason,
      amount: snapshot.amount ?? event.subscription?.amount,
      currency: snapshot.currency ?? event.subscription?.currency,
      recurrence: snapshot.recurrence ?? event.subscription?.recurrence,
    },
  };
}
