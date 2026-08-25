import { createHash } from "node:crypto";

import type { DB } from "@/lib/data/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { EduzzApiError, getEduzzSubscriptionSnapshot, mergeEduzzEventWithSnapshot } from "./eduzzApi";
import {
  applyGrant,
  findContractOwner,
  recordTransaction,
  resolveGatewayTarget,
  resolveOrCreateUser,
  syncSubscriptionSnapshot,
  type GatewayTarget,
} from "./provisioning";
import { loadGatewayWebhookConfig, type GatewayWebhookConfig } from "./secrets";
import type { BillingGateway, NormalizedBillingEvent } from "./types";
import { sendPurchaseWelcomeEmail } from "./welcome";

export class PermanentWebhookError extends Error {
  constructor(message: string) { super(message); this.name = "PermanentWebhookError"; }
}

export class TransientWebhookError extends Error {
  constructor(message: string) { super(message); this.name = "TransientWebhookError"; }
}

export type WebhookOutcome = { status: number; body: Record<string, unknown> };

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 120;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkWebhookRate(ip: string, now = Date.now()): boolean {
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (rateBuckets.size > 1000) {
      for (const [key, value] of rateBuckets) if (value.resetAt <= now) rateBuckets.delete(key);
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX_PER_WINDOW;
}

type ProcessResult = {
  status: "processed" | "ignored";
  userId: string | null;
  subscriptionId: string | null;
  enrollmentId: string | null;
  note?: string;
};

async function processEvent(db: DB, event: NormalizedBillingEvent, authoritative: boolean): Promise<ProcessResult> {
  if (event.action === "ignore") {
    return { status: "ignored", userId: null, subscriptionId: null, enrollmentId: null, note: "Evento sem efeito sobre o acesso." };
  }

  let target: GatewayTarget | null = null;
  if (event.product) {
    target = await resolveGatewayTarget(db, event.gateway, event.product.productId, event.product.offerId);
  }

  if (event.action === "grant") {
    if (!event.buyer || !event.product) {
      throw new TransientWebhookError("Contrato elegível sem comprador ou produto suficiente para provisionar.");
    }
    if (!target) {
      throw new PermanentWebhookError(
        `Produto ${event.product.productId}${event.product.offerId ? ` / oferta ${event.product.offerId}` : ""} não está mapeado.`,
      );
    }

    const contractOwner = event.subscription?.gatewaySubscriptionId
      ? await findContractOwner(db, event.gateway, event.subscription.gatewaySubscriptionId)
      : null;
    const user = contractOwner
      ? { userId: contractOwner, created: false, email: event.buyer.email }
      : await resolveOrCreateUser(db, event.buyer);
    const grant = await applyGrant(db, event, target, user.userId, new Date(), authoritative);
    await recordTransaction(db, event, {
      userId: user.userId,
      subscriptionId: grant.subscriptionId,
      planId: target.kind === "plan" ? target.planId : null,
      courseId: target.kind === "course" ? target.courseId : null,
    });
    if (user.created) {
      await sendPurchaseWelcomeEmail(db, {
        email: user.email,
        name: event.buyer.name,
        productName: target.kind === "plan" ? target.planName : target.courseTitle,
      });
    }
    return { status: "processed", userId: user.userId, subscriptionId: grant.subscriptionId, enrollmentId: grant.enrollmentId };
  }

  // Estados não concessivos nunca criam usuário. O contrato, e não o e-mail,
  // identifica a assinatura/matrícula que precisa mudar.
  const synced = await syncSubscriptionSnapshot(db, event, {
    planId: target?.kind === "plan" ? target.planId : null,
    courseId: target?.kind === "course" ? target.courseId : null,
    authoritative,
  });
  await recordTransaction(db, event, {
    userId: null,
    subscriptionId: synced.subscriptionId,
    planId: target?.kind === "plan" ? target.planId : null,
    courseId: target?.kind === "course" ? target.courseId : null,
  });

  if (!synced.applied && !synced.stale) {
    return {
      status: "ignored", userId: null, subscriptionId: synced.subscriptionId,
      enrollmentId: synced.enrollmentId, note: "Contrato desconhecido em atualização que não concede acesso.",
    };
  }
  return {
    status: "processed", userId: null, subscriptionId: synced.subscriptionId,
    enrollmentId: synced.enrollmentId,
    note: synced.stale ? "Snapshot de fallback mais antigo descartado." : undefined,
  };
}

function eventName(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const row = payload as Record<string, unknown>;
  const value = row.event ?? row.event_name ?? row.type;
  return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}

async function claimEvent(db: DB, event: NormalizedBillingEvent, payload: unknown) {
  const { data, error } = await db.rpc("claim_gateway_webhook_event", {
    p_gateway: event.gateway,
    p_event_id: event.eventId,
    p_event_type: event.eventType,
    p_payload: payload,
  });
  if (error) throw new Error(`Falha ao reivindicar evento: ${error.message}`);
  const result = (data ?? {}) as Record<string, unknown>;
  const state = result.state;
  if (state !== "claimed" && state !== "duplicate" && state !== "busy") {
    throw new Error("Resposta inválida ao reivindicar evento.");
  }
  return { state, id: typeof result.id === "string" ? result.id : undefined } as const;
}

async function enrichEduzzEvent(db: DB, event: NormalizedBillingEvent, config: GatewayWebhookConfig) {
  const contractId = event.subscription?.gatewaySubscriptionId;
  if (!contractId || !config.apiAccessToken) {
    return {
      event, authoritative: false,
      warning: contractId ? "API Eduzz não conectada; usando payload autenticado." : undefined,
    };
  }

  try {
    const snapshot = await getEduzzSubscriptionSnapshot({ accessToken: config.apiAccessToken, subscriptionId: contractId });
    if (config.producerId && snapshot.producerId && config.producerId !== snapshot.producerId) {
      throw new PermanentWebhookError("Produtor da assinatura diverge da conta Eduzz conectada.");
    }
    return { event: mergeEduzzEventWithSnapshot(event, snapshot), authoritative: true, warning: undefined };
  } catch (error) {
    if (error instanceof PermanentWebhookError) throw error;
    const apiError = error as EduzzApiError;
    if (apiError.status === 401 || apiError.status === 403) {
      await db.from("integrations").update({ status: "needs_reconnect" }).eq("slug", "eduzz");
    }
    return { event, authoritative: false, warning: apiError.message };
  }
}

export async function handleBillingWebhook(input: {
  gateway: BillingGateway;
  rawBody: string;
  clientIp: string;
  verifySignature: (secrets: readonly string[]) => boolean;
  normalize: (payload: unknown) => NormalizedBillingEvent | null;
}): Promise<WebhookOutcome> {
  const { gateway, rawBody, clientIp, verifySignature, normalize } = input;
  if (!checkWebhookRate(clientIp)) return { status: 429, body: { error: "Muitas requisições." } };
  if (!getSupabaseServiceRoleKey()) {
    console.error(`[webhook:${gateway}] service role ausente.`);
    return { status: 503, body: { error: "Integração de pagamento indisponível." } };
  }

  const db = createAdminClient();
  let config: GatewayWebhookConfig;
  try {
    config = await loadGatewayWebhookConfig(db, gateway);
  } catch (error) {
    console.error(`[webhook:${gateway}] configuração indisponível: ${(error as Error).message}`);
    return { status: 503, body: { error: "Configuração indisponível." } };
  }
  if (!config.enabled) return { status: 401, body: { error: "Integração desativada." } };
  if (!verifySignature(config.secrets)) return { status: 401, body: { error: "Assinatura inválida." } };

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch {
    return { status: 400, body: { error: "Corpo não é JSON válido." } };
  }
  if (eventName(payload) === "ping") return { status: 200, body: { ok: true, ping: true } };

  const normalized = normalize(payload);
  if (!normalized) {
    const fallbackId = `unparsed_${createHash("sha256").update(rawBody, "utf8").digest("hex").slice(0, 32)}`;
    await db.from("gateway_webhook_events").upsert({
      gateway, event_id: fallbackId, event_type: eventName(payload) ?? "desconhecido",
      signature_verified: true, payload, status: "ignored",
      error_message: "Payload autenticado sem contrato reconhecível.", processed_at: new Date().toISOString(),
    }, { onConflict: "gateway,event_id" });
    return { status: 200, body: { ok: true, ignored: true } };
  }

  let claim: Awaited<ReturnType<typeof claimEvent>>;
  try { claim = await claimEvent(db, normalized, payload); } catch (error) {
    console.error(`[webhook:${gateway}] ${(error as Error).message}`);
    return { status: 503, body: { error: "Falha ao registrar o evento." } };
  }
  if (claim.state === "duplicate") return { status: 200, body: { ok: true, duplicate: true } };
  if (claim.state === "busy") return { status: 200, body: { ok: true, processing: true } };
  if (!claim.id) return { status: 503, body: { error: "Evento sem referência de processamento." } };

  if (config.producerId && normalized.producerId && config.producerId !== normalized.producerId) {
    const reason = "Produtor divergente da conta Eduzz conectada; evento autenticado ignorado.";
    const { error } = await db.from("gateway_webhook_events").update({
      status: "ignored",
      error_message: reason,
      processed_at: new Date().toISOString(),
    }).eq("id", claim.id);
    if (error) {
      console.error(`[webhook:${gateway}] falha ao auditar produtor divergente: ${error.message}`);
      return { status: 503, body: { error: "Falha ao registrar o evento." } };
    }
    console.warn(`[webhook:${gateway}] ${normalized.eventType} ignorado: produtor divergente (${normalized.eventId})`);
    return { status: 200, body: { ok: true, ignored: true, reason: "producer_mismatch" } };
  }

  try {
    const enriched = gateway === "eduzz"
      ? await enrichEduzzEvent(db, normalized, config)
      : { event: normalized, authoritative: false, warning: undefined };
    const result = await processEvent(db, enriched.event, enriched.authoritative);
    await db.from("gateway_webhook_events").update({
      status: result.status, user_id: result.userId, subscription_id: result.subscriptionId,
      enrollment_id: result.enrollmentId, error_message: result.note ?? null,
      fallback_warning: enriched.warning ?? null, api_enriched: enriched.authoritative,
      processed_at: new Date().toISOString(),
    }).eq("id", claim.id);
    console.info(`[webhook:${gateway}] ${enriched.event.eventType} -> ${result.status} (${enriched.event.eventId})`);
    return { status: 200, body: { ok: true, result: result.status, fallback: Boolean(enriched.warning) } };
  } catch (error) {
    const permanent = error instanceof PermanentWebhookError;
    const message = (error as Error).message;
    await db.from("gateway_webhook_events").update({
      status: "failed", error_message: message, processed_at: new Date().toISOString(),
    }).eq("id", claim.id);
    console.error(`[webhook:${gateway}] ${normalized.eventType} falhou (${normalized.eventId}): ${message}`);
    return permanent
      ? { status: 200, body: { ok: false, failed: true, reason: message } }
      : { status: 503, body: { error: "Falha temporária ao processar o evento." } };
  }
}

/** Reprocessa apenas payload já autenticado e persistido; chamada exclusiva do admin. */
export async function replayEduzzWebhookEvent(db: DB, rowId: string): Promise<void> {
  const { data: row, error } = await db.from("gateway_webhook_events")
    .select("id, event_id, status, payload").eq("id", rowId).eq("gateway", "eduzz").maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Evento Eduzz não encontrado.");
  if (row.status !== "failed") throw new Error("Somente eventos com falha podem ser reprocessados.");

  const { normalizeEduzzEvent } = await import("./eduzz");
  const event = normalizeEduzzEvent(row.payload);
  if (!event || event.eventId !== row.event_id) throw new Error("Payload persistido não corresponde ao evento.");

  const claim = await claimEvent(db, event, row.payload);
  if (claim.state !== "claimed" || !claim.id) throw new Error("Evento já está em processamento.");

  try {
    const config = await loadGatewayWebhookConfig(db, "eduzz");
    if (config.producerId && event.producerId && config.producerId !== event.producerId) {
      throw new PermanentWebhookError("Produtor divergente.");
    }
    const enriched = await enrichEduzzEvent(db, event, config);
    const result = await processEvent(db, enriched.event, enriched.authoritative);
    await db.from("gateway_webhook_events").update({
      status: result.status, user_id: result.userId, subscription_id: result.subscriptionId,
      enrollment_id: result.enrollmentId, error_message: result.note ?? null,
      fallback_warning: enriched.warning ?? null, api_enriched: enriched.authoritative,
      processed_at: new Date().toISOString(),
    }).eq("id", claim.id);
  } catch (replayError) {
    await db.from("gateway_webhook_events").update({
      status: "failed", error_message: (replayError as Error).message, processed_at: new Date().toISOString(),
    }).eq("id", claim.id);
    throw replayError;
  }
}
