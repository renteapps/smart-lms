import { requireAdmin } from "@/lib/supabase/auth";
import { CreditsAdminClient } from "./CreditsAdminClient";
import { getCurrentExchangeRate } from "@/lib/aiBilling";

export default async function CreditsAdminPage() {
  const { adminClient } = await requireAdmin();
  // Atualiza a PTAX uma vez ao dia; a função usa a última taxa persistida se o BCB falhar.
  await getCurrentExchangeRate(adminClient).catch((error) => {
    console.error("[admin-credits:exchange-rate]", error);
  });
  await adminClient.rpc("refresh_ai_billing_period");
  const since = new Date();
  since.setDate(since.getDate() - 365);

  const [settingsResult, policiesResult, modelsResult, plansResult, eventsResult, ratesResult] = await Promise.all([
    adminClient.from("ai_billing_settings").select("*").eq("id", 1).single(),
    adminClient.from("ai_feature_policies").select("*").order("feature"),
    adminClient.from("ai_model_pricing").select("*").order("display_name"),
    adminClient.from("plans").select("id, name, is_active, ai_daily_credits, ai_weekly_credits, ai_monthly_credits").order("name"),
    adminClient.from("ai_usage_events").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(2000),
    adminClient.from("ai_exchange_rates").select("rate_date, usd_brl, source, fetched_at").order("rate_date", { ascending: false }).limit(1),
  ]);

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
    />
  );
}
