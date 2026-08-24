import { requireAdmin } from "@/lib/supabase/auth";
import { CreditsAdminClient } from "./CreditsAdminClient";
import { getCurrentExchangeRate } from "@/lib/aiBilling";
import { buildAiCreditForecast } from "@/lib/aiCreditForecast";

export default async function CreditsAdminPage() {
  const { adminClient } = await requireAdmin();
  // Atualiza a PTAX uma vez ao dia; a função usa a última taxa persistida se o BCB falhar.
  await getCurrentExchangeRate(adminClient).catch((error) => {
    console.error("[admin-credits:exchange-rate]", error);
  });
  await adminClient.rpc("refresh_ai_billing_period");
  const since = new Date();
  since.setDate(since.getDate() - 365);

  const [settingsResult, policiesResult, modelsResult, plansResult, eventsResult, ratesResult, subscriptionsResult, accountsResult] = await Promise.all([
    adminClient.from("ai_billing_settings").select("*").eq("id", 1).single(),
    adminClient.from("ai_feature_policies").select("*").order("feature"),
    adminClient.from("ai_model_pricing").select("*").order("display_name"),
    adminClient.from("plans").select("id, name, frequency, price, is_active, ai_daily_credits, ai_weekly_credits, ai_monthly_credits").order("name"),
    adminClient.from("ai_usage_events").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(2000),
    adminClient.from("ai_exchange_rates").select("rate_date, usd_brl, source, fetched_at").order("rate_date", { ascending: false }).limit(1),
    adminClient.from("subscriptions")
      .select("id, user_id, organization_id, plan_id, status, amount, started_at, current_period_end, created_at")
      .in("status", ["active", "trialing"])
      .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`),
    adminClient.from("ai_credit_accounts")
      .select("user_id, monthly_used, monthly_period_started_at, extra_balance"),
  ]);

  const organizationIds = [...new Set((subscriptionsResult.data ?? [])
    .map((subscription) => subscription.organization_id)
    .filter((id): id is string => Boolean(id)))];
  const membershipsResult = organizationIds.length
    ? await adminClient.from("organization_members")
      .select("user_id, organization_id, status")
      .in("organization_id", organizationIds)
      .eq("status", "active")
    : { data: [] };

  const settings = settingsResult.data;
  const globalMargin = Number(settings?.target_margin_percent) || 50;
  const chargedMargins = (policiesResult.data ?? [])
    .filter((policy) => policy.enabled && policy.charge_user)
    .map((policy) => policy.margin_override_percent == null ? globalMargin : Number(policy.margin_override_percent))
    .filter(Number.isFinite);
  const reserveMargin = chargedMargins.length ? Math.min(...chargedMargins) : globalMargin;
  const forecast = buildAiCreditForecast({
    creditValueBrl: Number(settings?.credit_value_brl) || 0.01,
    reserveMarginPercent: reserveMargin,
    operationalBufferPercent: Number(settings?.reservation_buffer_percent) || 25,
    plans: (plansResult.data ?? []).map((plan) => ({
      id: plan.id,
      name: plan.name,
      frequency: plan.frequency,
      price: plan.price,
      isActive: Boolean(plan.is_active),
      dailyCredits: plan.ai_daily_credits,
      weeklyCredits: plan.ai_weekly_credits,
      monthlyCredits: plan.ai_monthly_credits,
    })),
    subscriptions: (subscriptionsResult.data ?? []).map((subscription) => ({
      id: subscription.id,
      userId: subscription.user_id,
      organizationId: subscription.organization_id,
      planId: subscription.plan_id,
      status: subscription.status,
      amount: subscription.amount,
      startedAt: subscription.started_at,
      currentPeriodEnd: subscription.current_period_end,
      createdAt: subscription.created_at,
    })),
    memberships: (membershipsResult.data ?? []).map((membership) => ({
      userId: membership.user_id,
      organizationId: membership.organization_id,
      status: membership.status,
    })),
    accounts: (accountsResult.data ?? []).map((account) => ({
      userId: account.user_id,
      monthlyUsed: account.monthly_used,
      monthlyPeriodStartedAt: account.monthly_period_started_at,
      extraBalance: account.extra_balance,
    })),
  });

  const userIds = [...new Set((eventsResult.data ?? []).map((event) => event.user_id).filter(Boolean))];
  const profilesResult = userIds.length
    ? await adminClient.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };

  return (
    <CreditsAdminClient
      initialSettings={settingsResult.data}
      initialPolicies={policiesResult.data ?? []}
      initialModels={modelsResult.data ?? []}
      plans={plansResult.data ?? []}
      events={eventsResult.data ?? []}
      profiles={profilesResult.data ?? []}
      latestRate={ratesResult.data?.[0] ?? null}
      forecast={forecast}
    />
  );
}
