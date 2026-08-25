import type { DB, Row } from "@/lib/data/types";
import { resolveAccessEnd, resolveRevocationEnd } from "./periodEnd";
import type { BillingGateway, NormalizedBillingEvent } from "./types";

/**
 * A parte do fluxo de pagamento que encosta no banco.
 *
 * Recebe o client como primeiro argumento, igual a `lib/data/*` — mas aqui ele
 * precisa ser sempre o client de **service role**: o webhook não tem sessão, e
 * `subscriptions`/`enrollments` só liberam escrita para admin via RLS.
 */

export type GatewayTarget =
  | { kind: "plan"; planId: string; accessDays: number | null; frequency: string | null; planName: string }
  | { kind: "course"; courseId: string; accessDays: number | null; courseTitle: string };

/**
 * Descobre o que a compra libera.
 *
 * Duas etapas de propósito: a oferta exata tem precedência sobre o curinga do
 * produto. É o que permite "o produto 123 dá o plano Básico, mas a oferta
 * BLACK do mesmo produto dá o plano Premium" sem ambiguidade.
 */
export async function resolveGatewayTarget(
  db: DB,
  gateway: BillingGateway,
  productId: string,
  offerId?: string,
): Promise<GatewayTarget | null> {
  const { data, error } = await db
    .from("gateway_products")
    .select("plan_id, course_id, offer_id, access_days, plans:plan_id ( name, frequency ), courses:course_id ( title )")
    .eq("gateway", gateway)
    .eq("product_id", productId)
    .eq("is_active", true);

  if (error) throw new Error(`Falha ao resolver produto do gateway: ${error.message}`);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  const exact = offerId ? rows.find((row) => row.offer_id === offerId) : undefined;
  const wildcard = rows.find((row) => row.offer_id === null);
  const match = exact ?? wildcard;
  if (!match) return null;

  const accessDays = match.access_days != null ? Number(match.access_days) : null;

  if (match.plan_id) {
    const plan = Array.isArray(match.plans) ? match.plans[0] : match.plans;
    return {
      kind: "plan",
      planId: match.plan_id,
      accessDays,
      frequency: plan?.frequency ?? null,
      planName: plan?.name ?? "Plano",
    };
  }

  const course = Array.isArray(match.courses) ? match.courses[0] : match.courses;
  return {
    kind: "course",
    courseId: match.course_id,
    accessDays,
    courseTitle: course?.title ?? "Curso",
  };
}

/**
 * Procura o comprador sem criar conta.
 *
 * Reembolso e cancelamento usam esta versão: se não existe conta, não existe
 * acesso a revogar, e criar um usuário a partir de um estorno seria inventar
 * cadastro do nada.
 */
export async function findUserByEmail(db: DB, email: string): Promise<string | null> {
  const { data, error } = await db
    .from("profiles")
    .select("id")
    .ilike("email", email.trim().toLowerCase())
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao procurar o comprador: ${error.message}`);
  return data?.id ?? null;
}

export type ResolvedUser = { userId: string; created: boolean; email: string };

export async function findContractOwner(
  db: DB,
  gateway: BillingGateway,
  contractId: string,
): Promise<string | null> {
  const { data: subscription, error: subscriptionError } = await db.from("subscriptions")
    .select("user_id").eq("gateway", gateway).eq("gateway_subscription_id", contractId).maybeSingle();
  if (subscriptionError) throw new Error(`Falha ao localizar o contrato: ${subscriptionError.message}`);
  if (subscription?.user_id) return subscription.user_id;

  const { data: enrollment, error: enrollmentError } = await db.from("enrollments")
    .select("user_id").eq("gateway", gateway).eq("gateway_subscription_id", contractId).maybeSingle();
  if (enrollmentError) throw new Error(`Falha ao localizar a matrícula do contrato: ${enrollmentError.message}`);
  return enrollment?.user_id ?? null;
}

/**
 * Encontra o comprador, ou cria a conta dele.
 *
 * Quase ninguém compra já logado na plataforma — o checkout acontece no
 * gateway. Criar a conta aqui, com `email_confirm: true`, é o que faz o acesso
 * existir antes mesmo do primeiro login; o trigger `handle_new_user` cria o
 * `profiles` sozinho a partir do `user_metadata`.
 *
 * Nenhuma senha é definida: a pessoa recebe um link de definição de senha (ver
 * `sendWelcomeEmail`). Conta sem senha não é conta acessível por quem não tem o
 * e-mail.
 */
export async function resolveOrCreateUser(db: DB, buyer: NormalizedBillingEvent["buyer"]): Promise<ResolvedUser> {
  if (!buyer) throw new Error("Comprador ausente ao criar acesso.");
  const email = buyer.email.trim().toLowerCase();

  const { data: existing, error: lookupError } = await db
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (lookupError) throw new Error(`Falha ao procurar o comprador: ${lookupError.message}`);
  if (existing?.id) return { userId: existing.id, created: false, email };

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: buyer.name ?? null,
      phone: buyer.phone ?? null,
    },
  });

  if (createError || !created?.user?.id) {
    // Corrida: dois webhooks do mesmo comprador chegando juntos. O segundo
    // falha aqui, e a conta que o primeiro criou já serve.
    const { data: retry } = await db
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (retry?.id) return { userId: retry.id, created: false, email };
    throw new Error(`Falha ao criar a conta do comprador: ${createError?.message ?? "sem id"}`);
  }

  return { userId: created.user.id, created: true, email };
}

export type GrantResult = {
  subscriptionId: string | null;
  enrollmentId: string | null;
  courseId: string | null;
  accessEndsAt: string | null;
};

/**
 * Concede o acesso comprado.
 *
 * Plano vira linha em `subscriptions`; curso avulso vira matrícula. Os dois
 * caminhos são upserts por chave natural, então reprocessar o mesmo evento
 * atualiza em vez de duplicar — a trava de idempotência em
 * `gateway_webhook_events` é a primeira defesa, esta é a segunda.
 */
export async function applyGrant(
  db: DB,
  event: NormalizedBillingEvent,
  target: GatewayTarget,
  userId: string,
  now = new Date(),
  authoritative = false,
): Promise<GrantResult> {
  if (target.kind === "course") {
    const expiresAt = resolveAccessEnd({
      gatewayPeriodEnd: event.subscription?.currentPeriodEnd,
      accessDays: target.accessDays,
      now,
    });

    if (event.subscription?.gatewaySubscriptionId) {
      const synced = await syncSubscriptionSnapshot(db, event, {
        userId,
        courseId: target.courseId,
        currentPeriodEnd: expiresAt,
        amount: event.transaction?.amount ?? 0,
        authoritative,
      });
      return {
        subscriptionId: null,
        enrollmentId: synced.enrollmentId,
        courseId: target.courseId,
        accessEndsAt: expiresAt,
      };
    }

    const { data, error } = await db
      .from("enrollments")
      .upsert(
        {
          user_id: userId,
          course_id: target.courseId,
          status: "active",
          enrolled_at: now.toISOString(),
          expires_at: expiresAt,
          gateway: event.gateway,
          gateway_subscription_id: event.subscription?.gatewaySubscriptionId ?? null,
          gateway_updated_at: event.subscription?.updatedAt ?? event.sentAt ?? now.toISOString(),
        },
        { onConflict: "user_id,course_id" },
      ).select("id").single();

    if (error) throw new Error(`Falha ao matricular: ${error.message}`);
    return { subscriptionId: null, enrollmentId: data.id, courseId: target.courseId, accessEndsAt: expiresAt };
  }

  const periodEnd = resolveAccessEnd({
    gatewayPeriodEnd: event.subscription?.currentPeriodEnd,
    accessDays: target.accessDays,
    frequency: target.frequency as never,
    now,
  });

  const synced = await syncSubscriptionSnapshot(db, event, {
    userId,
    planId: target.planId,
    currentPeriodEnd: periodEnd,
    amount: event.transaction?.amount ?? event.subscription?.amount ?? 0,
    authoritative,
  });
  return { subscriptionId: synced.subscriptionId, enrollmentId: null, courseId: null, accessEndsAt: periodEnd };
}

export type SyncSubscriptionResult = {
  subscriptionId: string | null;
  enrollmentId: string | null;
  applied: boolean;
  stale: boolean;
};

/**
 * Sincroniza uma assinatura pela identidade estável do contrato. A função SQL
 * faz o lock e o ON CONFLICT com o predicado do índice parcial; o client não
 * consegue expressar esse predicado de forma segura por `.upsert()`.
 */
export async function syncSubscriptionSnapshot(
  db: DB,
  event: NormalizedBillingEvent,
  context: {
    userId?: string | null;
    planId?: string | null;
    courseId?: string | null;
    currentPeriodEnd?: string | null;
    amount?: number;
    authoritative?: boolean;
  } = {},
): Promise<SyncSubscriptionResult> {
  const contractId = event.subscription?.gatewaySubscriptionId;
  if (!contractId) return { subscriptionId: null, enrollmentId: null, applied: false, stale: false };

  const { data, error } = await db.rpc("sync_gateway_subscription", {
    p_gateway: event.gateway,
    p_gateway_subscription_id: contractId,
    p_user_id: context.userId ?? null,
    p_plan_id: context.planId ?? null,
    p_course_id: context.courseId ?? null,
    p_status: event.subscription?.localStatus ?? "pending",
    p_gateway_status: event.subscription?.gatewayStatus ?? null,
    p_current_period_end: context.currentPeriodEnd ?? effectiveAccessEnd(event),
    p_amount: context.amount ?? event.transaction?.amount ?? event.subscription?.amount ?? null,
    p_gateway_updated_at: event.subscription?.updatedAt ?? event.sentAt ?? new Date().toISOString(),
    p_cancel_at_period_end: event.subscription?.localStatus === "canceled",
    p_authoritative: context.authoritative ?? false,
  });

  if (error) throw new Error(`Falha ao sincronizar a assinatura: ${error.message}`);
  const result = (data ?? {}) as Record<string, unknown>;
  return {
    subscriptionId: typeof result.subscription_id === "string" ? result.subscription_id : null,
    enrollmentId: typeof result.enrollment_id === "string" ? result.enrollment_id : null,
    applied: result.applied === true,
    stale: result.stale === true,
  };
}

function effectiveAccessEnd(event: NormalizedBillingEvent): string | null {
  const subscription = event.subscription;
  const status = subscription?.localStatus;
  if (status === "expired") return new Date().toISOString();
  if (status === "suspended") return subscription?.accessRemovalAt ?? new Date().toISOString();
  if (status === "past_due") {
    return subscription?.removeOnLatePayment
      ? subscription.accessRemovalAt ?? subscription.currentPeriodEnd ?? null
      : subscription?.currentPeriodEnd ?? null;
  }
  if (status === "canceled") {
    return subscription?.accessRemovalAt ?? subscription?.currentPeriodEnd ?? null;
  }
  return subscription?.accessRemovalAt ?? subscription?.currentPeriodEnd ?? null;
}

/**
 * Revoga acesso.
 *
 * `now` é reembolso/chargeback: corta imediatamente. `period_end` é
 * cancelamento: a pessoa pagou o período, então mantém até a data e marca
 * `cancel_at_period_end` para a interface poder explicar o que vai acontecer.
 */
export async function applyRevocation(
  db: DB,
  event: NormalizedBillingEvent,
  target: GatewayTarget | null,
  userId: string,
  mode: "now" | "period_end",
  now = new Date(),
): Promise<GrantResult> {
  const status = mode === "now"
    ? (event.transaction?.status === "chargeback" ? "chargeback" : "refunded")
    : "canceled";

  if (target?.kind === "course") {
    const { data: current } = await db
      .from("enrollments")
      .select("expires_at")
      .eq("user_id", userId)
      .eq("course_id", target.courseId)
      .maybeSingle();

    const expiresAt = resolveRevocationEnd({
      mode,
      currentPeriodEnd: current?.expires_at ?? event.subscription?.currentPeriodEnd,
      now,
    });

    const { error } = await db
      .from("enrollments")
      .update({ expires_at: expiresAt, status: mode === "now" ? "inactive" : "active" })
      .eq("user_id", userId)
      .eq("course_id", target.courseId);

    if (error) throw new Error(`Falha ao revogar a matrícula: ${error.message}`);
    return { subscriptionId: null, enrollmentId: null, courseId: target.courseId, accessEndsAt: expiresAt };
  }

  // A assinatura é localizada pelo id do gateway quando existe; senão, pelo
  // plano do comprador. Cancelamento costuma chegar sem produto mapeado.
  let query = db.from("subscriptions").select("id, current_period_end").eq("user_id", userId);
  if (event.subscription?.gatewaySubscriptionId) {
    query = db
      .from("subscriptions")
      .select("id, current_period_end")
      .eq("gateway", event.gateway)
      .eq("gateway_subscription_id", event.subscription.gatewaySubscriptionId);
  } else if (target?.kind === "plan") {
    query = query.eq("plan_id", target.planId);
  }

  const { data: found, error: findError } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(`Falha ao localizar a assinatura: ${findError.message}`);
  if (!found?.id) return { subscriptionId: null, enrollmentId: null, courseId: null, accessEndsAt: null };

  const periodEnd = resolveRevocationEnd({
    mode,
    currentPeriodEnd: found.current_period_end,
    now,
  });

  const { error } = await db
    .from("subscriptions")
    .update({
      status,
      current_period_end: periodEnd,
      cancel_at_period_end: mode === "period_end",
      canceled_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", found.id);

  if (error) throw new Error(`Falha ao revogar a assinatura: ${error.message}`);
  return { subscriptionId: found.id, enrollmentId: null, courseId: null, accessEndsAt: periodEnd };
}

/** Marca inadimplência sem tirar o acesso — o gateway ainda vai tentar cobrar. */
export async function markPastDue(
  db: DB,
  event: NormalizedBillingEvent,
  userId: string,
): Promise<string | null> {
  if (!event.subscription?.gatewaySubscriptionId) return null;

  const { data, error } = await db
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("gateway", event.gateway)
    .eq("gateway_subscription_id", event.subscription.gatewaySubscriptionId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Falha ao marcar inadimplência: ${error.message}`);
  return data?.id ?? null;
}

/**
 * Registra a transação. Upsert por (gateway, transaction_id) porque um mesmo
 * pedido muda de status ao longo da vida — aprovado hoje, reembolsado depois — e
 * o que interessa é o estado atual, não uma linha por notificação.
 */
export async function recordTransaction(
  db: DB,
  event: NormalizedBillingEvent,
  context: { userId: string | null; subscriptionId: string | null; planId: string | null; courseId: string | null },
): Promise<void> {
  if (!event.transaction) return;
  const { error } = await db
    .from("gateway_transactions")
    .upsert(
      {
        gateway: event.gateway,
        transaction_id: event.transaction.id,
        subscription_id: context.subscriptionId,
        user_id: context.userId,
        plan_id: context.planId,
        course_id: context.courseId,
        status: event.transaction.status,
        amount: event.transaction.amount,
        currency: event.transaction.currency,
        occurred_at: event.transaction.occurredAt,
        raw: event as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "gateway,transaction_id" },
    );

  if (error) throw new Error(`Falha ao registrar a transação: ${error.message}`);
}
