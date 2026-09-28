import "server-only";

import { getQStashClient } from "@/lib/qstash";
import { getSiteUrl } from "@/lib/siteUrl";

/**
 * Rotinas agendadas da plataforma, executadas pelo QStash (Upstash Schedules).
 *
 * Os horários usam `CRON_TZ=America/Sao_Paulo`: o QStash respeita o fuso, então
 * "9h" é 9h em Brasília o ano todo. Cada agendamento tem `scheduleId` fixo —
 * sincronizar de novo atualiza em vez de duplicar.
 *
 * As duas rotas são seguras para repetir (retentativa do QStash ou disparo
 * manual): expirar de novo não muda nada, e os e-mails têm trava por período.
 */
export const CRON_JOBS = [
  {
    id: "subscriptions-expire",
    name: "Expirar assinaturas vencidas",
    description: "Marca como expiradas as assinaturas cujo período pago terminou.",
    path: "/api/cron/subscriptions-expire",
    cron: "CRON_TZ=America/Sao_Paulo 15 0 * * *",
    schedule: "Todo dia às 00:15 (Brasília)",
  },
  {
    id: "subscription-emails",
    name: "E-mails de vencimento e reconquista",
    description: "Aviso 7 dias antes do vencimento, aviso de expiração e sequência de reconquista (dias 3, 10, 20 e 30).",
    path: "/api/cron/subscription-emails",
    cron: "CRON_TZ=America/Sao_Paulo 0 9 * * *",
    schedule: "Todo dia às 09:00 (Brasília)",
  },
] as const;

export type CronJobId = (typeof CRON_JOBS)[number]["id"];

const SCHEDULE_PREFIX = "smartlms-";
const scheduleIdFor = (id: CronJobId) => `${SCHEDULE_PREFIX}${id}`;
const destinationFor = (path: string) => `${getSiteUrl()}${path}`;

export type CronJobStatus = {
  id: CronJobId;
  name: string;
  description: string;
  schedule: string;
  destination: string;
  /** Agendamento existe no QStash com o horário e o destino esperados. */
  state: "ok" | "missing" | "outdated" | "paused";
};

export type QStashConfigStatus = {
  token: boolean;
  signingKeys: boolean;
};

export function qstashConfigStatus(): QStashConfigStatus {
  return {
    token: Boolean(process.env.QSTASH_TOKEN?.trim()),
    signingKeys: Boolean(process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() && process.env.QSTASH_NEXT_SIGNING_KEY?.trim()),
  };
}

/** Compara a expressão; o fuso só conta se o QStash devolvê-lo. */
function sameCron(stored: string, expected: string): boolean {
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ");
  const withoutTz = (value: string) => normalize(value).replace(/^CRON_TZ=\S+\s+/, "");
  const storedHasTz = /^CRON_TZ=/.test(normalize(stored));
  return storedHasTz ? normalize(stored) === normalize(expected) : withoutTz(stored) === withoutTz(expected);
}

function requireClient() {
  const client = getQStashClient();
  if (!client) throw new Error("QSTASH_TOKEN não configurado neste ambiente.");
  return client;
}

/** Estado de cada rotina no QStash, comparado com o esperado no código. */
export async function getCronJobStatuses(): Promise<CronJobStatus[]> {
  const schedules = await requireClient().schedules.list();
  const byId = new Map(schedules.map((s) => [s.scheduleId, s]));

  return CRON_JOBS.map((job) => {
    const destination = destinationFor(job.path);
    const found = byId.get(scheduleIdFor(job.id));
    const state: CronJobStatus["state"] = !found
      ? "missing"
      : found.isPaused
        ? "paused"
        : !sameCron(found.cron, job.cron) || found.destination !== destination
          ? "outdated"
          : "ok";
    return { id: job.id, name: job.name, description: job.description, schedule: job.schedule, destination, state };
  });
}

/** Cria ou atualiza todos os agendamentos (idempotente pelo `scheduleId`). */
export async function syncCronSchedules(): Promise<void> {
  const client = requireClient();
  for (const job of CRON_JOBS) {
    await client.schedules.create({
      scheduleId: scheduleIdFor(job.id),
      destination: destinationFor(job.path),
      cron: job.cron,
      method: "POST",
      retries: 3,
      label: "smartlms-cron",
    });
  }
}

/** Dispara uma rotina agora, pelo mesmo caminho assinado do agendamento. */
export async function runCronJobNow(id: CronJobId): Promise<void> {
  const job = CRON_JOBS.find((item) => item.id === id);
  if (!job) throw new Error("Rotina desconhecida.");
  await requireClient().publish({ url: destinationFor(job.path), method: "POST", retries: 0 });
}

export function isCronJobId(value: unknown): value is CronJobId {
  return CRON_JOBS.some((job) => job.id === value);
}
