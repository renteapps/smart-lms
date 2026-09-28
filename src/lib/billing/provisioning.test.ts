import { describe, expect, it, vi } from "vitest";
import { exactEmailPattern, syncSubscriptionSnapshot } from "@/lib/billing/provisioning";
import type { NormalizedBillingEvent } from "@/lib/billing/types";
import type { DB } from "@/lib/data/types";

describe("exactEmailPattern", () => {
  it("normaliza e mantém e-mails comuns", () => {
    expect(exactEmailPattern("  Maria@Example.com ")).toBe("maria@example.com");
  });

  it("escapa curingas do ILIKE para não casar a conta de outra pessoa", () => {
    expect(exactEmailPattern("joao_silva@x.com")).toBe("joao\\_silva@x.com");
    expect(exactEmailPattern("a%b@x.com")).toBe("a\\%b@x.com");
    expect(exactEmailPattern("a\\b@x.com")).toBe("a\\\\b@x.com");
  });
});

describe("syncSubscriptionSnapshot", () => {
  const eventWith = (action: NormalizedBillingEvent["action"], localStatus?: string) => ({
    gateway: "hotmart",
    eventId: "e1",
    eventType: "PURCHASE_APPROVED",
    action,
    subscription: { gatewaySubscriptionId: "SUB-1", ...(localStatus && { localStatus }) },
  }) as unknown as NormalizedBillingEvent;

  const statusSent = async (event: NormalizedBillingEvent) => {
    const rpc = vi.fn(async () => ({ data: { subscription_id: "s1", applied: true }, error: null }));
    await syncSubscriptionSnapshot({ rpc } as unknown as DB, event);
    return (rpc.mock.calls[0] as unknown as [string, { p_status: string }])[1].p_status;
  };

  /*
   * Renovação (PURCHASE_APPROVED / invoice_paid) processada só com o payload,
   * sem a API do gateway, não traz status do contrato. Gravar "pending" ali
   * tirava o acesso de quem acabou de pagar.
   */
  it("pagamento aprovado sem status do contrato vira active, não pending", async () => {
    expect(await statusSent(eventWith("grant"))).toBe("active");
  });

  it("status do contrato vindo da API continua mandando", async () => {
    expect(await statusSent(eventWith("grant", "trialing"))).toBe("trialing");
  });

  it("evento que não concede acesso segue como pending", async () => {
    expect(await statusSent(eventWith("sync"))).toBe("pending");
  });
});
