import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const list = vi.fn();
const publish = vi.fn();
let client: unknown = { schedules: { create, list }, publish };
vi.mock("@/lib/qstash", () => ({ getQStashClient: () => client }));

import { CRON_JOBS, getCronJobStatuses, runCronJobNow, syncCronSchedules } from "./cronJobs";

describe("agendamentos no QStash", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ scheduleId: "x" });
    list.mockReset();
    publish.mockReset().mockResolvedValue({ messageId: "m" });
    client = { schedules: { create, list }, publish };
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.plataformag6.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sincroniza com ID fixo, POST, horário de Brasília e o domínio da plataforma", async () => {
    await syncCronSchedules();
    expect(create).toHaveBeenCalledTimes(CRON_JOBS.length);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: "smartlms-subscription-emails",
      destination: "https://www.plataformag6.com/api/cron/subscription-emails",
      cron: "CRON_TZ=America/Sao_Paulo 0 9 * * *",
      method: "POST",
      retries: 3,
    }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      scheduleId: "smartlms-subscriptions-expire",
      cron: "CRON_TZ=America/Sao_Paulo 15 0 * * *",
    }));
  });

  it("reporta ausente, pausado, desatualizado e ok", async () => {
    list.mockResolvedValue([
      {
        scheduleId: "smartlms-subscriptions-expire",
        cron: "CRON_TZ=America/Sao_Paulo 15 0 * * *",
        destination: "https://smart-lms-blue.vercel.app/api/cron/subscriptions-expire",
        isPaused: false,
      },
    ]);
    const [expire, emails] = await getCronJobStatuses();
    expect(expire.state).toBe("outdated");
    expect(emails.state).toBe("missing");

    list.mockResolvedValue([
      {
        scheduleId: "smartlms-subscriptions-expire",
        cron: "15 0 * * *", // QStash sem o prefixo de fuso: ainda confere
        destination: "https://www.plataformag6.com/api/cron/subscriptions-expire",
        isPaused: false,
      },
      {
        scheduleId: "smartlms-subscription-emails",
        cron: "CRON_TZ=America/Sao_Paulo 0 9 * * *",
        destination: "https://www.plataformag6.com/api/cron/subscription-emails",
        isPaused: true,
      },
    ]);
    const [expireOk, emailsPaused] = await getCronJobStatuses();
    expect(expireOk.state).toBe("ok");
    expect(emailsPaused.state).toBe("paused");
  });

  it("executar agora publica no mesmo destino, sem retentativa", async () => {
    await runCronJobNow("subscription-emails");
    expect(publish).toHaveBeenCalledWith({
      url: "https://www.plataformag6.com/api/cron/subscription-emails",
      method: "POST",
      retries: 0,
    });
  });

  it("sem QSTASH_TOKEN explica o que falta", async () => {
    client = null;
    await expect(syncCronSchedules()).rejects.toThrow(/QSTASH_TOKEN/);
  });
});
