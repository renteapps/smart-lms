import { describe, expect, it, vi } from "vitest";

import { EduzzApiError, getEduzzSubscriptionSnapshot, mergeEduzzEventWithSnapshot, normalizeEduzzSubscriptionSnapshot } from "./eduzzApi";
import type { NormalizedBillingEvent } from "./types";

const apiPayload = {
  id: "contract-123",
  updatedAt: "2026-08-24T12:00:00Z",
  status: "canceled",
  interruption: { removeAccessDate: "2026-09-01T12:00:00Z", reason: "Solicitação do cliente" },
  recurrence: { nextDueDate: "2026-09-24T12:00:00Z" },
  products: [{ id: "product-9" }],
  payment: { price: { value: 197, currency: "BRL" } },
  client: { name: "Aluna", email: "ALUNA@EXEMPLO.COM", phone: { countryCode: "55", areaCode: "11", number: "999999999" } },
};

describe("Eduzz subscription API", () => {
  it("normaliza o snapshot oficial completo", () => {
    expect(normalizeEduzzSubscriptionSnapshot(apiPayload)).toMatchObject({
      id: "contract-123", gatewayStatus: "canceled", localStatus: "canceled",
      nextDueAt: "2026-09-24T12:00:00.000Z", accessRemovalAt: "2026-09-01T12:00:00.000Z",
      reason: "Solicitação do cliente", buyer: { email: "aluna@exemplo.com", phone: "5511999999999" },
      product: { productId: "product-9" }, amount: 197, currency: "BRL",
    });
  });

  it("consulta com Bearer e timeout configurável", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(apiPayload), { status: 200 }));
    const snapshot = await getEduzzSubscriptionSnapshot({ accessToken: "token", subscriptionId: "contract/123", fetchImpl, timeoutMs: 50 });
    expect(snapshot.id).toBe("contract-123");
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("contract%2F123"), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer token" }),
    }));
  });

  it("preserva status HTTP de 401/404 para a política de fallback", async () => {
    for (const status of [401, 404]) {
      const fetchImpl = vi.fn(async () => new Response("{}", { status }));
      await expect(getEduzzSubscriptionSnapshot({ accessToken: "x", subscriptionId: "1", fetchImpl }))
        .rejects.toMatchObject({ status });
    }
  });

  it("converte timeout em erro da Eduzz", async () => {
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }));
    await expect(getEduzzSubscriptionSnapshot({ accessToken: "x", subscriptionId: "1", fetchImpl: fetchImpl as typeof fetch, timeoutMs: 2 }))
      .rejects.toEqual(expect.any(EduzzApiError));
  });

  it("a API prevalece sobre o status e os dados do webhook", () => {
    const event: NormalizedBillingEvent = {
      gateway: "eduzz", eventId: "e1", eventType: "myeduzz.contract_updated", action: "grant",
      buyer: { email: "antigo@exemplo.com" }, product: { productId: "old" },
      subscription: { gatewaySubscriptionId: "contract-123", gatewayStatus: "upToDate", localStatus: "active" },
    };
    const merged = mergeEduzzEventWithSnapshot(event, normalizeEduzzSubscriptionSnapshot(apiPayload));
    expect(merged.action).toBe("revoke_at_period_end");
    expect(merged.buyer?.email).toBe("aluna@exemplo.com");
    expect(merged.product?.productId).toBe("product-9");
  });
});
