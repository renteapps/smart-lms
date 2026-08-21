"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";

export type BillingSettingsInput = {
  creditValueBrl: number;
  targetMarginPercent: number;
  exchangeBufferPercent: number;
  reservationBufferPercent: number;
  monthlyBudgetBrl: number;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
  defaultDailyCredits: number;
  defaultWeeklyCredits: number;
  defaultMonthlyCredits: number;
  manualExchangeRate: number | null;
};

const finite = (value: number, min: number, max = Number.MAX_SAFE_INTEGER) =>
  Number.isFinite(value) && value >= min && value <= max;

export async function saveBillingSettings(input: BillingSettingsInput) {
  const { adminClient, user } = await requireAdmin();
  if (
    !finite(input.creditValueBrl, 0.000001)
    || !finite(input.targetMarginPercent, 0, 99.999)
    || !finite(input.exchangeBufferPercent, 0, 100)
    || !finite(input.reservationBufferPercent, 0, 200)
    || !finite(input.monthlyBudgetBrl, 0.01)
    || !finite(input.warningThresholdPercent, 0.001, 99.998)
    || !finite(input.criticalThresholdPercent, input.warningThresholdPercent + 0.001, 99.999)
    || !finite(input.defaultDailyCredits, 1)
    || !finite(input.defaultWeeklyCredits, input.defaultDailyCredits)
    || !finite(input.defaultMonthlyCredits, input.defaultWeeklyCredits)
    || (input.manualExchangeRate !== null && !finite(input.manualExchangeRate, 0.000001))
  ) return { success: false, message: "Revise os valores: limites e percentuais estão fora da faixa permitida." };

  const { error } = await adminClient.from("ai_billing_settings").update({
    credit_value_brl: input.creditValueBrl,
    target_margin_percent: input.targetMarginPercent,
    exchange_buffer_percent: input.exchangeBufferPercent,
    reservation_buffer_percent: input.reservationBufferPercent,
    monthly_budget_brl: input.monthlyBudgetBrl,
    warning_threshold_percent: input.warningThresholdPercent,
    critical_threshold_percent: input.criticalThresholdPercent,
    default_daily_credits: input.defaultDailyCredits,
    default_weekly_credits: input.defaultWeeklyCredits,
    default_monthly_credits: input.defaultMonthlyCredits,
    manual_exchange_rate: input.manualExchangeRate,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { success: false, message: error.message };
  if (input.manualExchangeRate !== null) {
    const today = new Date().toISOString().slice(0, 10);
    const { error: rateError } = await adminClient.from("ai_exchange_rates").upsert({
      rate_date: today,
      usd_brl: input.manualExchangeRate,
      source: "manual",
      fetched_at: new Date().toISOString(),
    }, { onConflict: "rate_date,source" });
    if (rateError) return { success: false, message: `Configuração salva, mas o histórico de câmbio falhou: ${rateError.message}` };
  }
  revalidatePath("/admin/credits");
  revalidatePath("/admin/ajustes");
  return { success: true, message: "Configurações de cobrança salvas." };
}

export async function saveFeaturePolicy(input: {
  feature: string;
  enabled: boolean;
  chargeUser: boolean;
  marginOverridePercent: number | null;
  maxOutputTokens: number;
}) {
  const { adminClient } = await requireAdmin();
  if (!finite(input.maxOutputTokens, 1, 32000) || (input.marginOverridePercent !== null && !finite(input.marginOverridePercent, 0, 99.999))) {
    return { success: false, message: "Política inválida." };
  }
  const { error } = await adminClient.from("ai_feature_policies").update({
    enabled: input.enabled,
    charge_user: input.feature === "admin_sandbox" ? false : input.chargeUser,
    margin_override_percent: input.marginOverridePercent,
    max_output_tokens: Math.trunc(input.maxOutputTokens),
    updated_at: new Date().toISOString(),
  }).eq("feature", input.feature);
  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/credits");
  return { success: true, message: "Política atualizada." };
}

export async function saveModelPricing(input: {
  model: string;
  promptUsdPerMillion: number;
  completionUsdPerMillion: number;
  enabled: boolean;
}) {
  const { adminClient } = await requireAdmin();
  if (!input.model || !finite(input.promptUsdPerMillion, 0) || !finite(input.completionUsdPerMillion, 0)) {
    return { success: false, message: "Preço de modelo inválido." };
  }
  const { error } = await adminClient.from("ai_model_pricing").update({
    prompt_usd_per_million: input.promptUsdPerMillion,
    completion_usd_per_million: input.completionUsdPerMillion,
    enabled: input.enabled,
    updated_at: new Date().toISOString(),
  }).eq("model", input.model);
  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/credits");
  return { success: true, message: "Modelo atualizado." };
}

export async function savePlanLimits(input: { planId: string; daily: number; weekly: number; monthly: number }) {
  const { adminClient } = await requireAdmin();
  if (!finite(input.daily, 1) || !finite(input.weekly, input.daily) || !finite(input.monthly, input.weekly)) {
    return { success: false, message: "As cotas devem crescer de diária para mensal." };
  }
  const { error } = await adminClient.from("plans").update({
    ai_daily_credits: input.daily,
    ai_weekly_credits: input.weekly,
    ai_monthly_credits: input.monthly,
    updated_at: new Date().toISOString(),
  }).eq("id", input.planId);
  if (error) return { success: false, message: error.message };
  revalidatePath("/admin/credits");
  revalidatePath(`/admin/planos/${input.planId}`);
  return { success: true, message: "Franquia do plano atualizada." };
}
