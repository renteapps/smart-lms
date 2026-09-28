import { isSubscriptionActive } from "@/lib/courseAccess";

/**
 * Calendário dos e-mails de ciclo de vida da assinatura — função pura, sem
 * banco, para ser testada janela a janela.
 *
 * Tudo é decidido pela data de término (`current_period_end`), não pelo
 * status: `canceled` nunca vira `expired` no banco, e o cron que expira roda
 * antes deste. "Renovou" = o término foi para o futuro, e aí nada de
 * reconquista cabe mais.
 *
 * Janelas em vez de dias exatos: se o cron falhar num dia, o passo ainda sai
 * no seguinte (a UNIQUE em subscription_email_sends garante uma vez só).
 */

export const DAY_MS = 86_400_000;
/** Aviso prévio: a partir de quantos dias antes do término. */
export const REMINDER_DAYS = 7;
/** Carência de quem tem cobrança recorrente: tempo das retentativas do gateway. */
export const RENEWAL_GRACE_DAYS = 3;

export type LifecycleKind =
  | "renewal_reminder"
  | "expiration_warning"
  | "subscription_expired"
  | "winback_1"
  | "winback_2"
  | "winback_3"
  | "winback_4";

export type LifecycleSubscription = {
  id: string;
  user_id: string | null;
  status: string;
  gateway: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
};

/** Dias contados a partir do início do encerramento → e-mail daquela etapa. */
const LAPSE_WINDOWS: { from: number; to: number; kind: LifecycleKind }[] = [
  { from: 0, to: 3, kind: "subscription_expired" },
  { from: 3, to: 10, kind: "winback_1" },
  { from: 10, to: 20, kind: "winback_2" },
  { from: 20, to: 30, kind: "winback_3" },
  { from: 30, to: 37, kind: "winback_4" },
];

/** Estados que nunca recebem estes e-mails: estorno, chargeback, compra não concluída. */
const EXCLUDED_STATUSES = new Set(["refunded", "chargeback", "pending"]);

/**
 * Cobrança recorrente ainda em curso no gateway. `expired` entra porque o cron
 * marca `expired` no dia do vencimento, antes de a renovação ser cobrada — e é
 * justamente esse o intervalo da carência.
 */
export function hasAutoRenew(sub: LifecycleSubscription): boolean {
  return (sub.gateway === "hotmart" || sub.gateway === "eduzz")
    && !sub.cancel_at_period_end
    && ["active", "trialing", "past_due", "expired"].includes(sub.status);
}

export function planLifecycleEmail(sub: LifecycleSubscription, now: Date): LifecycleKind | null {
  if (!sub.user_id || !sub.current_period_end || EXCLUDED_STATUSES.has(sub.status)) return null;
  const end = new Date(sub.current_period_end).getTime();
  if (Number.isNaN(end)) return null;

  const autoRenew = hasAutoRenew(sub);
  const untilEnd = end - now.getTime();

  if (untilEnd > 0) {
    if (untilEnd > REMINDER_DAYS * DAY_MS) return null;
    // Só avisa quem ainda tem acesso por esta assinatura.
    if (!isSubscriptionActive({ status: sub.status, currentPeriodEnd: sub.current_period_end }, now)) return null;
    return autoRenew ? "renewal_reminder" : "expiration_warning";
  }

  const lapseStart = end + (autoRenew ? RENEWAL_GRACE_DAYS * DAY_MS : 0);
  const days = (now.getTime() - lapseStart) / DAY_MS;
  if (days < 0) return null; // ainda na carência da cobrança recorrente
  return LAPSE_WINDOWS.find((w) => days >= w.from && days < w.to)?.kind ?? null;
}
