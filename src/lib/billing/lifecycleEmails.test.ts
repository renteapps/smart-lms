import { beforeEach, describe, expect, it, vi } from "vitest";

const sendConfiguredEmail = vi.fn();
const categories = {
  platform: { renewalNotices: true } as Record<string, boolean>,
  notifications: { winback: true } as Record<string, boolean>,
};
vi.mock("@/lib/resendServer", () => ({
  sendConfiguredEmail: (...args: unknown[]) => sendConfiguredEmail(...args),
  getResendServerConfig: async () => ({ categories }),
}));
vi.mock("@/lib/emailUnsubscribe", () => ({
  buildUnsubscribe: (userId: string) => ({
    pageUrl: `https://www.plataformag6.com/descadastrar?u=${userId}`,
    headers: { "List-Unsubscribe": "<https://x/unsub>" },
  }),
}));

import { newsSummary, progressSummary, runSubscriptionLifecycleEmails } from "./lifecycleEmails";
import { DAY_MS } from "./lifecyclePlan";
import type { DB } from "@/lib/data/types";

const NOW = new Date("2026-09-27T12:00:00Z");
const at = (days: number) => new Date(NOW.getTime() + days * DAY_MS).toISOString();

type Row = Record<string, unknown>;

/**
 * Banco em memória com o subconjunto de PostgREST usado pelo motor:
 * select/filtros encadeados, upsert com ignoreDuplicates na UNIQUE e update.
 */
function fakeDb(tables: Record<string, Row[]>) {
  const sends: Row[] = tables.subscription_email_sends ?? (tables.subscription_email_sends = []);
  let nextId = 1;

  function builder(table: string) {
    const filters: ((row: Row) => boolean)[] = [];
    let mode: "select" | "upsert" | "update" = "select";
    let payload: Row = {};
    let head = false;

    const b = {
      select: (_cols?: string, opts?: { head?: boolean }) => { head = Boolean(opts?.head); return b; },
      eq: (col: string, v: unknown) => { filters.push((r) => r[col] === v); return b; },
      in: (col: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[col])); return b; },
      not: (col: string) => { filters.push((r) => r[col] != null); return b; },
      gte: (col: string, v: string) => { filters.push((r) => String(r[col]) >= v); return b; },
      lte: (col: string, v: string) => { filters.push((r) => String(r[col]) <= v); return b; },
      gt: (col: string, v: string) => { filters.push((r) => String(r[col]) > v); return b; },
      order: () => b,
      limit: () => b,
      maybeSingle: async () => ({ data: null, error: null }),
      upsert: (row: Row) => { mode = "upsert"; payload = row; return b; },
      update: (row: Row) => { mode = "update"; payload = row; return b; },
      then: (resolve: (v: unknown) => void) => resolve(run()),
    };

    function run() {
      const rows = tables[table] ?? [];
      if (mode === "upsert") {
        const dup = sends.find((s) => s.subscription_id === payload.subscription_id
          && s.kind === payload.kind && s.period_end === payload.period_end);
        if (dup) return { data: [], error: null };
        const row = { id: `send-${nextId++}`, ...payload };
        sends.push(row);
        return { data: [row], error: null };
      }
      const matched = rows.filter((r) => filters.every((f) => f(r)));
      if (mode === "update") {
        matched.forEach((r) => Object.assign(r, payload));
        return { data: matched, error: null };
      }
      return { data: head ? null : matched, count: matched.length, error: null };
    }
    return b;
  }
  return { db: { from: builder } as unknown as DB, sends };
}

const plan = { name: "Plano Anual", features: { checkoutUrl: "https://pay.hotmart.com/Q107609367K" }, is_active: true };
const sub = (id: string, userId: string, endInDays: number, extra: Row = {}): Row => ({
  id, user_id: userId, status: "canceled", gateway: "hotmart", cancel_at_period_end: true,
  current_period_end: at(endInDays), plans: plan, organization_id: null, ...extra,
});
const profile = (id: string) => ({ id, full_name: "Ana Souza", email: `${id}@x.com` });

describe("runSubscriptionLifecycleEmails", () => {
  beforeEach(() => {
    sendConfiguredEmail.mockReset();
    sendConfiguredEmail.mockResolvedValue({ success: true, id: "re_1" });
    categories.platform.renewalNotices = true;
    categories.notifications.winback = true;
  });

  it("envia o passo certo com as variáveis e registra o envio", async () => {
    const { db, sends } = fakeDb({
      subscriptions: [sub("s1", "u1", 5)],
      profiles: [profile("u1")],
    });
    const summary = await runSubscriptionLifecycleEmails(db, NOW);

    expect(summary).toMatchObject({ sent: 1, failed: 0 });
    const payload = sendConfiguredEmail.mock.calls[0][1];
    expect(payload.template).toBe("expiration_warning");
    expect(payload.to).toBe("u1@x.com");
    expect(payload.data).toMatchObject({
      nome: "Ana",
      nome_plano: "Plano Anual",
      data_vencimento: "02/10/2026",
      link_renovacao: "https://pay.hotmart.com/Q107609367K",
      nome_gateway: "Hotmart",
    });
    expect(sends).toHaveLength(1);
    expect(sends[0]).toMatchObject({ kind: "expiration_warning", status: "sent" });
  });

  it("não repete o mesmo e-mail na segunda execução", async () => {
    const { db } = fakeDb({ subscriptions: [sub("s1", "u1", 5)], profiles: [profile("u1")] });
    await runSubscriptionLifecycleEmails(db, NOW);
    const second = await runSubscriptionLifecycleEmails(db, NOW);
    expect(sendConfiguredEmail).toHaveBeenCalledTimes(1);
    expect(second.sent).toBe(0);
  });

  it("quem tem outra assinatura com acesso não recebe reconquista", async () => {
    const { db } = fakeDb({
      subscriptions: [
        sub("s1", "u1", -12),
        sub("s2", "u1", 300, { status: "active", cancel_at_period_end: false }),
      ],
      profiles: [profile("u1")],
    });
    const summary = await runSubscriptionLifecycleEmails(db, NOW);
    expect(sendConfiguredEmail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it("reconquista leva descadastro e respeita quem se descadastrou", async () => {
    const withLink = fakeDb({ subscriptions: [sub("s1", "u1", -12)], profiles: [profile("u1")] });
    await runSubscriptionLifecycleEmails(withLink.db, NOW);
    const payload = sendConfiguredEmail.mock.calls[0][1];
    expect(payload.template).toBe("winback_2");
    expect(payload.data.link_descadastro).toContain("/descadastrar");
    expect(payload.headers).toHaveProperty("List-Unsubscribe");

    sendConfiguredEmail.mockClear();
    const optedOut = fakeDb({
      subscriptions: [sub("s1", "u1", -12)],
      profiles: [profile("u1")],
      email_opt_outs: [{ user_id: "u1", category: "winback" }],
    });
    await runSubscriptionLifecycleEmails(optedOut.db, NOW);
    expect(sendConfiguredEmail).not.toHaveBeenCalled();
  });

  it("categoria desligada no admin não envia nem reserva", async () => {
    categories.notifications.winback = false;
    const { db, sends } = fakeDb({ subscriptions: [sub("s1", "u1", -12)], profiles: [profile("u1")] });
    await runSubscriptionLifecycleEmails(db, NOW);
    expect(sendConfiguredEmail).not.toHaveBeenCalled();
    expect(sends).toHaveLength(0);
  });

  it("falha no envio fica marcada e tenta de novo na execução seguinte", async () => {
    sendConfiguredEmail.mockResolvedValueOnce({ success: false, error: "Resend fora do ar" });
    const { db, sends } = fakeDb({ subscriptions: [sub("s1", "u1", -1)], profiles: [profile("u1")] });

    const first = await runSubscriptionLifecycleEmails(db, NOW);
    expect(first.failed).toBe(1);
    expect(sends[0]).toMatchObject({ status: "failed", error: "Resend fora do ar" });

    const second = await runSubscriptionLifecycleEmails(db, NOW);
    expect(second.sent).toBe(1);
    expect(sends[0].status).toBe("sent");
  });

  it("envio simulado (Resend sem chave) não conta como enviado", async () => {
    sendConfiguredEmail.mockResolvedValue({ success: true, simulated: true });
    const { db, sends } = fakeDb({ subscriptions: [sub("s1", "u1", -1)], profiles: [profile("u1")] });
    const summary = await runSubscriptionLifecycleEmails(db, NOW);
    expect(summary.sent).toBe(0);
    expect(sends[0].status).toBe("failed");
  });
});

describe("frases de progresso e novidades", () => {
  it("nunca mostra zero", () => {
    expect(progressSummary(0, null)).not.toMatch(/\b0\b/);
    expect(newsSummary(0, 0)).not.toMatch(/\b0\b/);
  });

  it("singular e plural", () => {
    expect(progressSummary(1, "Liderança")).toBe("Você já concluiu 1 aula — a última foi em “Liderança”.");
    expect(progressSummary(23, null)).toBe("Você já concluiu 23 aulas na plataforma.");
    expect(newsSummary(1, 12)).toBe("Desde que seu acesso terminou, entraram na plataforma 1 curso novo e 12 aulas novas.");
  });
});
