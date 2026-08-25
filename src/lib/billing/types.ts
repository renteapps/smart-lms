/**
 * Vocabulário comum dos gateways de pagamento.
 *
 * Eduzz e Hotmart mandam payloads bem diferentes; tudo é traduzido para
 * `NormalizedBillingEvent` antes de encostar no banco, e é só essa forma que o
 * provisionamento conhece. Acrescentar um terceiro gateway (Kiwify, Stripe)
 * passa a ser escrever um normalizador novo, sem tocar no resto.
 */

export type BillingGateway = "eduzz" | "hotmart";

/**
 * O que o evento manda fazer com o acesso.
 *
 * A distinção entre `revoke_at_period_end` e `revoke_now` é a política de
 * revogação do produto: quem cancela uma assinatura usa até o fim do período
 * que já pagou; quem pediu reembolso ou abriu chargeback perde na hora.
 */
export type BillingAction =
  | "grant"
  | "sync"
  | "revoke_at_period_end"
  | "revoke_now"
  | "past_due"
  | "ignore";

export type BillingTransactionStatus =
  | "pending"
  | "approved"
  | "canceled"
  | "refunded"
  | "chargeback";

export type LocalSubscriptionStatus =
  | "active"
  | "trialing"
  | "pending"
  | "past_due"
  | "suspended"
  | "canceled"
  | "refunded"
  | "chargeback"
  | "expired";

export type EduzzContractStatus =
  | "upToDate"
  | "awaitingPayment"
  | "late"
  | "canceled"
  | "defaulter"
  | "suspended"
  | "trial"
  | "finished"
  | "free";

export type BillingBuyer = {
  email: string;
  name?: string;
  phone?: string;
  document?: string;
};

export type BillingProductRef = {
  productId: string;
  /** Ausente = a compra não identificou oferta; casa com o curinga do mapeamento. */
  offerId?: string;
};

export type BillingTransactionRef = {
  id: string;
  amount: number;
  currency: string;
  /** ISO 8601. */
  occurredAt: string;
  status: BillingTransactionStatus;
};

export type BillingSubscriptionRef = {
  /** Chave estável da assinatura no gateway — é o que torna o upsert idempotente. */
  gatewaySubscriptionId?: string;
  /** ISO 8601, ou `null` para acesso sem prazo (vitalício). */
  currentPeriodEnd?: string | null;
  gatewayStatus?: string;
  localStatus?: LocalSubscriptionStatus;
  updatedAt?: string;
  accessRemovalAt?: string | null;
  removeOnLatePayment?: boolean;
  removeOnContractEnd?: boolean;
  reason?: string;
  amount?: number;
  currency?: string;
  recurrence?: { type?: string; value?: number; nextDueAt?: string | null };
};

export type NormalizedBillingEvent = {
  gateway: BillingGateway;
  /** Identidade do evento no gateway. Base do índice único de deduplicação. */
  eventId: string;
  eventType: string;
  sentAt?: string;
  producerId?: string;
  action: BillingAction;
  buyer?: BillingBuyer;
  product?: BillingProductRef;
  transaction?: BillingTransactionRef;
  subscription?: BillingSubscriptionRef;
};

export type BillingEventOutcome = {
  action: BillingAction;
  transactionStatus: BillingTransactionStatus;
  localStatus?: LocalSubscriptionStatus;
};

export type EduzzSubscriptionSnapshot = {
  id: string;
  producerId?: string;
  gatewayStatus: string;
  localStatus: LocalSubscriptionStatus;
  updatedAt?: string;
  nextDueAt?: string | null;
  recurrence?: { type?: string; value?: number; nextDueAt?: string | null };
  accessRemovalAt?: string | null;
  removeOnLatePayment?: boolean;
  removeOnContractEnd?: boolean;
  reason?: string;
  buyer?: BillingBuyer;
  product?: BillingProductRef;
  amount?: number;
  currency?: string;
};
