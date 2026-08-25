import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
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

  it("recusa produtor divergente antes de persistir", async () => {
    const result = await handleBillingWebhook({
      gateway: "eduzz", rawBody: '{"event":"myeduzz.contract_updated"}', clientIp: "producer-mismatch",
      verifySignature: () => true, normalize,
    });
    expect(result.status).toBe(403);
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
