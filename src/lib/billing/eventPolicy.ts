import type { BillingEventOutcome } from "./types";

/**
 * De-para entre o nome do evento no gateway e o que fazer com o acesso.
 *
 * Duas regras estruturais aqui:
 *
 *  1. **O default é `ignore`.** Evento desconhecido nunca concede nem revoga —
 *     ele é gravado como `ignored` em `gateway_webhook_events` e fica visível no
 *     admin. Um gateway pode lançar um evento novo a qualquer momento e isso
 *     não pode virar acesso liberado por acidente.
 *  2. **A política de revogação é diferenciada**: cancelamento respeita o
 *     período já pago (`revoke_at_period_end`), reembolso e chargeback cortam
 *     na hora (`revoke_now`). Quem cancelou pagou pelo mês; quem estornou não.
 */

const IGNORE: BillingEventOutcome = { action: "ignore", transactionStatus: "pending" };

const EDUZZ_EVENTS: Record<string, BillingEventOutcome> = {
  "myeduzz.invoice_paid": { action: "grant", transactionStatus: "approved" },
  "myeduzz.invoice_canceled": { action: "revoke_at_period_end", transactionStatus: "canceled" },

  "myeduzz.invoice_refunded": { action: "revoke_now", transactionStatus: "refunded" },
  "myeduzz.invoice_chargeback": { action: "revoke_now", transactionStatus: "chargeback" },

  // Eventos de tentativa e estados intermediários são informativos. A mudança
  // de acesso só acontece quando chegar o estado final da fatura/contrato.
  "myeduzz.contract_bankslip_attempted": IGNORE,
  "myeduzz.contract_card_attempted": IGNORE,
  "myeduzz.contract_eduzz_balance_attempted": IGNORE,
  "myeduzz.contract_pix_attempted": IGNORE,
  "myeduzz.commission_processed": IGNORE,
  "myeduzz.invoice_expired": IGNORE,
  "myeduzz.invoice_negotiated": IGNORE,
  "myeduzz.invoice_opened": IGNORE,
  "myeduzz.invoice_recovering": IGNORE,
  "myeduzz.invoice_scheduled": IGNORE,
  "myeduzz.invoice_waiting_payment": IGNORE,
  "myeduzz.invoice_waiting_refund": IGNORE,
  "sun.cart_abandonment": IGNORE,
};

const EDUZZ_CONTRACT_STATUS: Record<string, BillingEventOutcome> = {
  uptodate: { action: "grant", transactionStatus: "approved", localStatus: "active" },
  paid: { action: "grant", transactionStatus: "approved", localStatus: "active" },
  free: { action: "grant", transactionStatus: "approved", localStatus: "active" },
  trial: { action: "grant", transactionStatus: "approved", localStatus: "trialing" },
  awaitingpayment: { action: "sync", transactionStatus: "pending", localStatus: "pending" },
  late: { action: "past_due", transactionStatus: "pending", localStatus: "past_due" },
  defaulter: { action: "past_due", transactionStatus: "pending", localStatus: "past_due" },
  canceled: { action: "revoke_at_period_end", transactionStatus: "canceled", localStatus: "canceled" },
  cancelled: { action: "revoke_at_period_end", transactionStatus: "canceled", localStatus: "canceled" },
  suspended: { action: "sync", transactionStatus: "pending", localStatus: "suspended" },
  finished: { action: "sync", transactionStatus: "canceled", localStatus: "expired" },
};

/**
 * `myeduzz.invoice_status_changed` não diz no nome o que aconteceu — o status
 * vem no corpo. Este mapa traduz esse campo.
 */
const EDUZZ_INVOICE_STATUS: Record<string, BillingEventOutcome> = {
  paid: { action: "grant", transactionStatus: "approved" },
  paid_manually: { action: "grant", transactionStatus: "approved" },
  refunded: { action: "revoke_now", transactionStatus: "refunded" },
  chargeback: { action: "revoke_now", transactionStatus: "chargeback" },
  canceled: { action: "revoke_at_period_end", transactionStatus: "canceled" },
  cancelled: { action: "revoke_at_period_end", transactionStatus: "canceled" },
  overdue: { action: "past_due", transactionStatus: "pending" },
  open: IGNORE,
  waiting_payment: IGNORE,
};

const HOTMART_EVENTS: Record<string, BillingEventOutcome> = {
  PURCHASE_APPROVED: { action: "grant", transactionStatus: "approved" },
  PURCHASE_COMPLETE: { action: "grant", transactionStatus: "approved" },
  // Troca de plano: o payload já vem com o produto novo, então conceder é o
  // comportamento certo — o mapeamento resolve para o plano novo.
  SWITCH_PLAN: { action: "grant", transactionStatus: "approved" },

  PURCHASE_CANCELED: { action: "revoke_at_period_end", transactionStatus: "canceled" },
  SUBSCRIPTION_CANCELLATION: { action: "revoke_at_period_end", transactionStatus: "canceled" },

  PURCHASE_REFUNDED: { action: "revoke_now", transactionStatus: "refunded" },
  PURCHASE_CHARGEBACK: { action: "revoke_now", transactionStatus: "chargeback" },
  PURCHASE_PROTEST: { action: "revoke_now", transactionStatus: "chargeback" },

  PURCHASE_DELAYED: { action: "past_due", transactionStatus: "pending" },

  // Boleto impresso e boleto vencido nunca chegaram a virar acesso, então não
  // há o que revogar.
  PURCHASE_BILLET_PRINTED: IGNORE,
  PURCHASE_EXPIRED: IGNORE,
  PURCHASE_OUT_OF_SHOPPING_CART: IGNORE,
  // Só desloca a data da próxima cobrança. O período vigente continua valendo e
  // o próximo PURCHASE_APPROVED traz a data autoritativa.
  UPDATE_SUBSCRIPTION_CHARGE_DATE: IGNORE,
  CLUB_FIRST_ACCESS: IGNORE,
  CLUB_MODULE_COMPLETED: IGNORE,
};

export function resolveEduzzOutcome(eventType: string, invoiceStatus?: string | null): BillingEventOutcome {
  const key = (eventType ?? "").trim().toLowerCase();

  if (key === "myeduzz.contract_created" || key === "myeduzz.contract_updated") {
    const status = (invoiceStatus ?? "").replace(/[^a-z]/gi, "").toLowerCase();
    return EDUZZ_CONTRACT_STATUS[status] ?? IGNORE;
  }

  if (key === "myeduzz.invoice_status_changed") {
    const status = (invoiceStatus ?? "").trim().toLowerCase();
    return EDUZZ_INVOICE_STATUS[status] ?? IGNORE;
  }

  return EDUZZ_EVENTS[key] ?? IGNORE;
}

export function resolveEduzzContractStatus(status?: string | null): BillingEventOutcome {
  const normalized = (status ?? "").replace(/[^a-z]/gi, "").toLowerCase();
  return EDUZZ_CONTRACT_STATUS[normalized] ?? IGNORE;
}

export function resolveHotmartOutcome(eventType: string): BillingEventOutcome {
  const key = (eventType ?? "").trim().toUpperCase();
  return HOTMART_EVENTS[key] ?? IGNORE;
}

/** Só `grant` estende acesso — usado para decidir se vale resolver o mapeamento. */
export function outcomeGrantsAccess(outcome: BillingEventOutcome): boolean {
  return outcome.action === "grant";
}
