import "server-only";

import { Receiver } from "@upstash/qstash";

import { safeEquals } from "@/lib/billing/signature";
import { getSiteUrl } from "@/lib/siteUrl";

export type CronAuthResult = { ok: true } | { ok: false; status: 401 | 503; error: string };

/**
 * Quem pode disparar uma rota de cron (`/api/cron/*`).
 *
 *  - **QStash (Upstash Schedules)** — o agendador de produção. Chega como POST
 *    com `Upstash-Signature`, um JWT assinado pelas chaves da conta, que cobre
 *    o corpo e a URL de destino. Sem as chaves configuradas, recusa.
 *  - **`Authorization: Bearer $CRON_SECRET`** — para disparo manual (curl).
 *
 * `/api/` é prefixo público no middleware, então a rota se defende sozinha.
 */
export async function authorizeCronRequest(request: Request, path: string): Promise<CronAuthResult> {
  const signature = request.headers.get("upstash-signature");

  if (signature) {
    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();
    if (!currentSigningKey || !nextSigningKey) {
      return { ok: false, status: 503, error: "Chaves de assinatura do QStash ausentes." };
    }

    const body = await request.text();
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    // A assinatura inclui a URL de destino do agendamento. Aceita a URL que de
    // fato chegou e a canônica — atrás de proxy as duas podem diferir no host.
    for (const url of new Set([request.url, `${getSiteUrl()}${path}`])) {
      try {
        if (await receiver.verify({ signature, body, url })) return { ok: true };
      } catch {
        // assinatura não confere para esta URL; tenta a próxima
      }
    }
    return { ok: false, status: 401, error: "Assinatura do QStash inválida." };
  }

  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (cronSecret && safeEquals(authorization, `Bearer ${cronSecret}`)) return { ok: true };
  return { ok: false, status: 401, error: "Não autorizado." };
}
