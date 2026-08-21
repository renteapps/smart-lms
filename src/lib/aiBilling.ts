import "server-only";

import type { OpenRouterChatMessage, OpenRouterChatResponse } from "@/types/openrouter";
import { calculateAiPrice, calculateTokenCostUsd, estimateMessagesTokens, roundCredits } from "@/lib/aiPricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

export type AiFeature = "agent_chat" | "platform_assistant" | "admin_sandbox";

type BillingRow = Record<string, unknown>;

export class AiBillingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AiBillingError";
  }
}

export type AiUsageReservation = {
  eventId: string;
  feature: AiFeature;
  model: string;
  exchangeRate: number;
  creditValueBrl: number;
  marginPercent: number;
  exchangeBufferPercent: number;
  promptUsdPerMillion: number;
  completionUsdPerMillion: number;
  reservedCredits: number;
  chargeUser: boolean;
  maxOutputTokens: number;
};

export type AiSettlement = {
  creditsCharged: number;
  creditsRemaining: number;
  refundedCredits: number;
};

function requireBillingAdmin() {
  if (!getSupabaseServiceRoleKey()) {
    throw new AiBillingError(
      "O faturamento de IA exige SUPABASE_SERVICE_ROLE_KEY no servidor.",
      503,
      "billing_unavailable",
    );
  }
  return createAdminClient();
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const fortalezaDate = (value = new Date()) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Fortaleza",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(value);

function mapReservationError(message: string) {
  if (message.includes("AI_CREDITS_INSUFFICIENT")) {
    return new AiBillingError("Créditos de IA insuficientes.", 402, "ai_credits_insufficient");
  }
  if (message.includes("AI_DAILY_LIMIT_EXCEEDED")) {
    return new AiBillingError("Seu limite diário de IA foi atingido.", 429, "ai_daily_limit_reached");
  }
  if (message.includes("AI_WEEKLY_LIMIT_EXCEEDED")) {
    return new AiBillingError("Seu limite semanal de IA foi atingido.", 429, "ai_weekly_limit_reached");
  }
  if (message.includes("AI_MONTHLY_LIMIT_EXCEEDED")) {
    return new AiBillingError("Seu limite mensal de IA foi atingido.", 429, "ai_monthly_limit_reached");
  }
  if (message.includes("AI_GLOBAL_BUDGET_EXCEEDED")) {
    return new AiBillingError("A IA foi pausada porque o orçamento mensal foi atingido.", 503, "ai_budget_paused");
  }
  if (message.includes("AI_FEATURE_DISABLED")) {
    return new AiBillingError("Esta função de IA está pausada.", 503, "ai_feature_disabled");
  }
  if (message.includes("AI_MODEL_PRICING_UNAVAILABLE")) {
    return new AiBillingError("Este modelo está sem preço confiável ou foi bloqueado.", 503, "model_pricing_unavailable");
  }
  return new AiBillingError("Não foi possível reservar créditos para esta chamada.", 503, "billing_reservation_failed");
}

async function fetchLatestPtax() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  const format = (date: Date) => `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}-${date.getUTCFullYear()}`;
  const endpoint = new URL("https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)");
  endpoint.searchParams.set("@dataInicial", `'${format(start)}'`);
  endpoint.searchParams.set("@dataFinalCotacao", `'${format(end)}'`);
  endpoint.searchParams.set("$top", "100");
  endpoint.searchParams.set("$format", "json");

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(4_000), cache: "no-store" });
  if (!response.ok) throw new Error(`PTAX ${response.status}`);
  const payload = await response.json() as { value?: Array<{ cotacaoVenda?: number; dataHoraCotacao?: string }> };
  const latest = (payload.value ?? [])
    .filter((row) => Number.isFinite(Number(row.cotacaoVenda)))
    .sort((a, b) => String(b.dataHoraCotacao).localeCompare(String(a.dataHoraCotacao)))[0];
  if (!latest) throw new Error("Cotação PTAX indisponível.");
  return { rate: Number(latest.cotacaoVenda), date: String(latest.dataHoraCotacao).slice(0, 10) || new Date().toISOString().slice(0, 10) };
}

export async function getCurrentExchangeRate(admin = requireBillingAdmin()) {
  const { data: settings, error: settingsError } = await admin
    .from("ai_billing_settings")
    .select("manual_exchange_rate")
    .eq("id", 1)
    .single();
  if (settingsError) throw new AiBillingError("Configuração de câmbio indisponível.", 503, "exchange_unavailable");
  const manual = asNumber(settings?.manual_exchange_rate);
  if (manual > 0) return manual;

  const today = fortalezaDate();
  const { data: stored } = await admin
    .from("ai_exchange_rates")
    .select("rate_date, usd_brl, fetched_at")
    .eq("source", "bcb_ptax")
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (stored?.fetched_at && fortalezaDate(new Date(stored.fetched_at)) === today && asNumber(stored.usd_brl) > 0) {
    return asNumber(stored.usd_brl);
  }

  try {
    const quote = await fetchLatestPtax();
    await admin.from("ai_exchange_rates").upsert(
      { rate_date: quote.date, usd_brl: quote.rate, source: "bcb_ptax", fetched_at: new Date().toISOString() },
      { onConflict: "rate_date,source" },
    );
    return quote.rate;
  } catch (error) {
    if (asNumber(stored?.usd_brl) > 0) return asNumber(stored?.usd_brl);
    console.error("[ai-billing:ptax]", error);
    throw new AiBillingError("Não há uma cotação USD/BRL válida. Configure uma taxa manual.", 503, "exchange_unavailable");
  }
}

export async function reserveAiUsage(input: {
  userId: string;
  feature: AiFeature;
  model: string;
  messages: OpenRouterChatMessage[];
  maxOutputTokens: number;
}): Promise<AiUsageReservation> {
  const admin = requireBillingAdmin();
  const [{ data: settings, error: settingsError }, { data: policy, error: policyError }, { data: model, error: modelError }, exchangeRate] = await Promise.all([
    admin.from("ai_billing_settings").select("*").eq("id", 1).single(),
    admin.from("ai_feature_policies").select("*").eq("feature", input.feature).single(),
    admin.from("ai_model_pricing").select("*").eq("model", input.model).eq("enabled", true).maybeSingle(),
    getCurrentExchangeRate(admin),
  ]);

  if (settingsError || policyError) throw new AiBillingError("Configuração de cobrança indisponível.", 503, "billing_unavailable");
  if (modelError || !model) throw new AiBillingError("Este modelo está sem preço confiável ou foi bloqueado.", 503, "model_pricing_unavailable");
  if (!policy.enabled) throw new AiBillingError("Esta função de IA está pausada.", 503, "ai_feature_disabled");

  const promptUsdPerMillion = asNumber(model.prompt_usd_per_million);
  const completionUsdPerMillion = asNumber(model.completion_usd_per_million);
  const promptTokens = Math.ceil(estimateMessagesTokens(input.messages) * 1.25);
  const outputTokens = Math.min(input.maxOutputTokens, Number(policy.max_output_tokens));
  const estimatedCostUsd = calculateTokenCostUsd(promptTokens, outputTokens, promptUsdPerMillion, completionUsdPerMillion);
  const marginPercent = asNumber(policy.margin_override_percent, asNumber(settings.target_margin_percent));
  const price = calculateAiPrice({
    providerCostUsd: estimatedCostUsd,
    exchangeRate,
    exchangeBufferPercent: asNumber(settings.exchange_buffer_percent),
    marginPercent,
    creditValueBrl: asNumber(settings.credit_value_brl),
    minimumCredits: Number(policy.minimum_credits),
  });
  const reservationFactor = 1 + asNumber(settings.reservation_buffer_percent) / 100;
  const reservedCredits = policy.charge_user ? roundCredits(price.credits * reservationFactor) : 0;
  const estimatedProviderCostBrl = price.providerCostBrl * reservationFactor;
  const requestKey = crypto.randomUUID();

  const { data, error } = await admin.rpc("reserve_ai_usage", {
    p_user_id: input.userId,
    p_feature: input.feature,
    p_model: input.model,
    p_request_key: requestKey,
    p_estimated_cost_brl: estimatedProviderCostBrl,
    p_reservation_credits: reservedCredits,
    p_exchange_rate: exchangeRate,
    p_charge_user: Boolean(policy.charge_user),
  });
  if (error) throw mapReservationError(error.message);
  const row = data as BillingRow;

  return {
    eventId: String(row.event_id),
    feature: input.feature,
    model: input.model,
    exchangeRate,
    creditValueBrl: asNumber(settings.credit_value_brl),
    marginPercent,
    exchangeBufferPercent: asNumber(settings.exchange_buffer_percent),
    promptUsdPerMillion,
    completionUsdPerMillion,
    reservedCredits,
    chargeUser: Boolean(policy.charge_user),
    maxOutputTokens: outputTokens,
  };
}

export async function settleAiUsage(
  reservation: AiUsageReservation,
  response: OpenRouterChatResponse,
  metadata: Record<string, unknown> = {},
): Promise<AiSettlement> {
  const admin = requireBillingAdmin();
  const usage = response.usage;
  const providerCostUsd = usage?.costUsd != null
    ? usage.costUsd
    : calculateTokenCostUsd(
        usage?.promptTokens ?? 0,
        usage?.completionTokens ?? 0,
        reservation.promptUsdPerMillion,
        reservation.completionUsdPerMillion,
      );
  const pricingSource = usage?.costUsd != null ? "provider" : "estimated";
  const price = calculateAiPrice({
    providerCostUsd,
    exchangeRate: reservation.exchangeRate,
    exchangeBufferPercent: reservation.exchangeBufferPercent,
    marginPercent: reservation.marginPercent,
    creditValueBrl: reservation.creditValueBrl,
  });
  const creditsCharged = reservation.chargeUser ? Math.min(price.credits, reservation.reservedCredits) : 0;
  const { data, error } = await admin.rpc("settle_ai_usage", {
    p_event_id: reservation.eventId,
    p_credits_charged: creditsCharged,
    p_provider_cost_usd: providerCostUsd,
    p_provider_cost_brl: price.providerCostBrl,
    p_protected_cost_brl: price.protectedCostBrl,
    p_prompt_tokens: usage?.promptTokens ?? 0,
    p_completion_tokens: usage?.completionTokens ?? 0,
    p_reasoning_tokens: usage?.reasoningTokens ?? 0,
    p_cached_tokens: usage?.cachedTokens ?? 0,
    p_generation_id: response.generationId ?? null,
    p_pricing_source: pricingSource,
    p_metadata: metadata,
  });
  if (error) throw new AiBillingError("A resposta foi gerada, mas a cobrança não pôde ser confirmada.", 503, "billing_settlement_failed");
  const row = data as BillingRow;
  return {
    creditsCharged: asNumber(row.credits_charged),
    creditsRemaining: asNumber(row.credits_remaining),
    refundedCredits: asNumber(row.refunded_credits),
  };
}

export async function cancelAiUsage(
  reservation: AiUsageReservation | null,
  errorCode: string,
  response?: OpenRouterChatResponse | null,
) {
  if (!reservation) return;
  const admin = requireBillingAdmin();
  const providerCostUsd = response?.usage?.costUsd ?? (response?.usage
    ? calculateTokenCostUsd(
        response.usage.promptTokens,
        response.usage.completionTokens,
        reservation.promptUsdPerMillion,
        reservation.completionUsdPerMillion,
      )
    : 0);
  const providerCostBrl = providerCostUsd * reservation.exchangeRate;
  const { error } = await admin.rpc("cancel_ai_usage", {
    p_event_id: reservation.eventId,
    p_error_code: errorCode,
    p_provider_cost_usd: providerCostUsd,
    p_provider_cost_brl: providerCostBrl,
    p_prompt_tokens: response?.usage?.promptTokens ?? 0,
    p_completion_tokens: response?.usage?.completionTokens ?? 0,
    p_generation_id: response?.generationId ?? null,
  });
  if (error) console.error("[ai-billing:cancel]", error.message);
}
