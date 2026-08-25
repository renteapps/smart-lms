import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => {
  const eq = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq }));
  const upsert = vi.fn(async () => ({ error: null }));
  const from = vi.fn(() => ({ update, upsert }));
  const rpc = vi.fn(async () => ({ data: { state: "claimed", id: "row-1" }, error: null }));
  return { eq, update, upsert, from, rpc };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: dbMocks.from, rpc: dbMocks.rpc })),
}));
vi.mock("@/lib/supabase/env", () => ({ getSupabaseServiceRoleKey: vi.fn(() => "service-role") }));
vi.mock("./secrets", () => ({
  loadGatewayWebhookConfig: vi.fn(async () => ({ enabled: true, secrets: ["secret"], producerId: "producer-1" })),
}));
vi.mock("./welcome", () => ({ sendPurchaseWelcomeEmail: vi.fn() }));

import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { checkWebhookRate, handleBillingWebhook } from "./handleWebhook";

const normalize = vi.fn(() => ({
  gateway: "eduzz" as const,
  eventId: "evt-1",
  eventType: "myeduzz.contract_updated",
  producerId: "producer-2",
  action: "sync" as const,
  subscription: { gatewaySubscriptionId: "contract-1", localStatus: "pending" as const },
}));

describe("handleBillingWebhook security boundary", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseServiceRoleKey).mockReturnValue("service-role");
    normalize.mockClear();
    dbMocks.eq.mockClear();
    dbMocks.update.mockClear();
    dbMocks.upsert.mockClear();
    dbMocks.from.mockClear();
    dbMocks.rpc.mockClear();
    dbMocks.rpc.mockResolvedValue({ data: { state: "claimed", id: "row-1" }, error: null });
  });

  it("aceita ping autenticado sem provisionar", async () => {
    const result = await handleBillingWebhook({
      gateway: "eduzz", rawBody: '{"event":"ping"}', clientIp: "ping-1",
      verifySignature: () => true, normalize,
    });
    expect(result).toEqual({ status: 200, body: { ok: true, ping: true } });
    expect(normalize).not.toHaveBeenCalled();
  });

  it("falha fechado antes de ler o payload quando a assinatura é inválida", async () => {
    const result = await handleBillingWebhook({
      gateway: "eduzz", rawBody: '{"event":"ping"}', clientIp: "invalid-signature",
      verifySignature: () => false, normalize,
    });
    expect(result.status).toBe(401);
    expect(normalize).not.toHaveBeenCalled();
  });

  it("responde 400 para JSON inválido depois da autenticação", async () => {
    const result = await handleBillingWebhook({
      gateway: "eduzz", rawBody: "{", clientIp: "invalid-json",
      verifySignature: () => true, normalize,
    });
    expect(result.status).toBe(400);
  });

  it("audita produtor divergente e responde 200 sem processar", async () => {
    const result = await handleBillingWebhook({
      gateway: "eduzz", rawBody: '{"event":"myeduzz.contract_updated"}', clientIp: "producer-mismatch",
      verifySignature: () => true, normalize,
    });
    expect(result).toEqual({
      status: 200,
      body: { ok: true, ignored: true, reason: "producer_mismatch" },
    });
    expect(dbMocks.rpc).toHaveBeenCalledWith("claim_gateway_webhook_event", expect.objectContaining({
      p_gateway: "eduzz",
      p_event_type: "myeduzz.contract_updated",
    }));
    expect(dbMocks.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "ignored",
      error_message: expect.stringContaining("Produtor divergente"),
    }));
  });

  it("processa normalmente quando o produtor corresponde", async () => {
    const result = await handleBillingWebhook({
      gateway: "eduzz", rawBody: '{"event":"myeduzz.invoice_opened"}', clientIp: "matching-producer",
      verifySignature: () => true,
      normalize: () => ({
        gateway: "eduzz", eventId: "evt-matching", eventType: "myeduzz.invoice_opened",
        producerId: "producer-1", action: "ignore",
      }),
    });
    expect(result).toEqual({ status: 200, body: { ok: true, result: "ignored", fallback: false } });
    expect(dbMocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: "ignored" }));
  });

  it.each([
    "myeduzz.commission_processed",
    "myeduzz.contract_bankslip_attempted",
    "myeduzz.contract_card_attempted",
    "myeduzz.contract_created",
    "myeduzz.contract_eduzz_balance_attempted",
    "myeduzz.contract_pix_attempted",
    "myeduzz.contract_updated",
    "myeduzz.invoice_canceled",
    "myeduzz.invoice_chargeback",
    "myeduzz.invoice_expired",
    "myeduzz.invoice_negotiated",
    "myeduzz.invoice_opened",
    "myeduzz.invoice_paid",
    "myeduzz.invoice_recovering",
    "myeduzz.invoice_refunded",
    "myeduzz.invoice_scheduled",
    "myeduzz.invoice_waiting_payment",
    "myeduzz.invoice_waiting_refund",
    "sun.cart_abandonment",
  ])("responde 2xx ao evento autenticado %s", async (eventType) => {
    dbMocks.rpc.mockResolvedValueOnce({ data: { state: "claimed", id: `row-${eventType}` }, error: null });
    const result = await handleBillingWebhook({
      gateway: "eduzz",
      rawBody: JSON.stringify({ event: eventType }),
      clientIp: `event-${eventType}`,
      verifySignature: () => true,
      normalize: () => ({
        gateway: "eduzz", eventId: `evt-${eventType}`, eventType,
        producerId: "producer-1", action: "ignore",
      }),
    });
    expect(result.status).toBe(200);
  });

  it("responde 503 sem service role para permitir reenvio", async () => {
    vi.mocked(getSupabaseServiceRoleKey).mockReturnValue("");
    const result = await handleBillingWebhook({
      gateway: "eduzz", rawBody: '{"event":"ping"}', clientIp: "no-service-role",
      verifySignature: () => true, normalize,
    });
    expect(result.status).toBe(503);
  });

  it("limita rajadas e permite nova janela", () => {
    const now = 1_000_000;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      expect(checkWebhookRate("rate-test", now)).toBe(true);
    }
    expect(checkWebhookRate("rate-test", now)).toBe(false);
    expect(checkWebhookRate("rate-test", now + 60_001)).toBe(true);
  });
});
