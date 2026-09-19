"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/supabase/auth";
import { calculateExpiresAt, type ExpirationOption } from "@/lib/enrollmentUtils";

export interface AssignManualSubscriptionInput {
  userId: string;
  planId: string;
  wasPaid: boolean;
  amountPaid?: number;
  status: "active" | "trialing";
  expirationType: ExpirationOption;
  customDate?: string | null;
  reason: string;
}

export interface CancelManualSubscriptionInput {
  subscriptionId: string;
  userId: string;
}

export type SubscriptionActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

function revalidateSubscriptionPaths(userId: string, subscriptionId?: string) {
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/planos/assinaturas");
  if (subscriptionId) revalidatePath(`/admin/planos/assinaturas/${subscriptionId}`);
  revalidatePath("/admin/analises/assinaturas");
  revalidatePath("/admin/analises/vendas");
}

/**
 * Concede manualmente uma assinatura de plano a um usuário — usado quando o
 * webhook da Hotmart/Eduzz falha em chegar, mas o pagamento existe (ou para
 * conceder cortesia). Não mexe em assinaturas ativas de outros planos do
 * usuário, o mesmo comportamento que o provisionamento por webhook já tem.
 */
export async function assignManualSubscription(
  input: AssignManualSubscriptionInput
): Promise<SubscriptionActionResult<{ subscriptionId: string }>> {
  try {
    const reason = input.reason?.trim();
    if (!input.userId || !input.planId) {
      return { success: false, message: "Usuário e plano são obrigatórios." };
    }
    if (!reason) {
      return { success: false, message: "Informe o motivo da atribuição manual." };
    }
    if (input.wasPaid && (input.amountPaid == null || Number.isNaN(Number(input.amountPaid)) || Number(input.amountPaid) < 0)) {
      return { success: false, message: "Informe um valor pago válido." };
    }

    const { supabase, adminClient, user } = await requireAdmin();
    const client = adminClient || supabase;

    let currentPeriodEnd: string | null;
    try {
      currentPeriodEnd = calculateExpiresAt(input.expirationType, input.customDate);
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }

    const amount = input.wasPaid ? Number(input.amountPaid) : 0;
    const startedAt = new Date().toISOString();

    const { data: existing, error: existingError } = await client
      .from("subscriptions")
      .select("id")
      .eq("user_id", input.userId)
      .eq("plan_id", input.planId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingError) {
      return { success: false, message: `Erro ao verificar assinaturas existentes: ${existingError.message}` };
    }

    const existingId = existing?.[0]?.id as string | undefined;

    const row = {
      user_id: input.userId,
      plan_id: input.planId,
      status: input.status,
      amount,
      gateway: "manual",
      gateway_subscription_id: null,
      gateway_status: null,
      gateway_updated_at: null,
      started_at: startedAt,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
      canceled_at: null,
    };

    const query = existingId
      ? client.from("subscriptions").update(row).eq("id", existingId).select("id").single()
      : client.from("subscriptions").insert(row).select("id").single();

    const { data: subscription, error: subscriptionError } = await query;
    if (subscriptionError || !subscription) {
      return { success: false, message: `Erro ao gravar assinatura: ${subscriptionError?.message ?? "falha desconhecida"}` };
    }

    const { error: transactionError } = await client.from("gateway_transactions").insert({
      gateway: "manual",
      transaction_id: `manual-${randomUUID()}`,
      subscription_id: subscription.id,
      user_id: input.userId,
      plan_id: input.planId,
      status: "approved",
      amount,
      currency: "BRL",
      occurred_at: startedAt,
      raw: { source: "manual_admin_grant", reason, admin_id: user.id, was_paid: input.wasPaid },
    });
    if (transactionError) {
      console.warn("[assignManualSubscription] falha ao registrar gateway_transactions:", transactionError.message);
    }

    const { error: auditError } = await client.from("audit_logs").insert({
      actor_id: user.id,
      action: "manual_subscription_grant",
      target_type: "subscription",
      target_id: subscription.id,
      metadata: {
        plan_id: input.planId,
        user_id: input.userId,
        amount,
        was_paid: input.wasPaid,
        status: input.status,
        expiration_type: input.expirationType,
        reason,
      },
    });
    if (auditError) {
      console.warn("[assignManualSubscription] falha ao registrar audit_logs:", auditError.message);
    }

    revalidateSubscriptionPaths(input.userId, subscription.id);

    return { success: true, data: { subscriptionId: subscription.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Cancela uma assinatura atribuída manualmente. Nunca cancela um contrato
 * real de gateway (Hotmart/Eduzz) — isso tem fluxo próprio em `actions/admin/hotmart.ts`.
 */
export async function cancelManualSubscription(
  input: CancelManualSubscriptionInput
): Promise<SubscriptionActionResult> {
  try {
    if (!input.subscriptionId) {
      return { success: false, message: "ID da assinatura é obrigatório." };
    }

    const { supabase, adminClient, user } = await requireAdmin();
    const client = adminClient || supabase;

    const { data: sub, error: fetchError } = await client
      .from("subscriptions")
      .select("id, user_id, gateway, status")
      .eq("id", input.subscriptionId)
      .maybeSingle();

    if (fetchError || !sub) {
      return { success: false, message: fetchError?.message ?? "Assinatura não encontrada." };
    }
    if (sub.gateway && sub.gateway !== "manual") {
      return { success: false, message: "Esta assinatura pertence a um gateway externo e não pode ser cancelada por aqui." };
    }

    const { error: updateError } = await client
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", input.subscriptionId);

    if (updateError) {
      return { success: false, message: `Erro ao cancelar assinatura: ${updateError.message}` };
    }

    const { error: auditError } = await client.from("audit_logs").insert({
      actor_id: user.id,
      action: "manual_subscription_cancel",
      target_type: "subscription",
      target_id: input.subscriptionId,
      metadata: { user_id: sub.user_id, previous_status: sub.status },
    });
    if (auditError) {
      console.warn("[cancelManualSubscription] falha ao registrar audit_logs:", auditError.message);
    }

    revalidateSubscriptionPaths(input.userId || sub.user_id, input.subscriptionId);

    return { success: true, message: "Assinatura cancelada com sucesso." };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
