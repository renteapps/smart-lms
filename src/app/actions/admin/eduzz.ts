"use server";

import { revalidatePath } from "next/cache";

import { replayEduzzWebhookEvent } from "@/lib/billing/handleWebhook";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/supabase/auth";

const ADMIN_PATH = "/admin/integracoes/eduzz";

function requireServiceRole() {
  if (!getSupabaseServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor.");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function clean(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export type EduzzAdminConfig = {
  enabled: boolean;
  status: string;
  webhookKeyCount: number;
  hasClientId: boolean;
  hasClientSecret: boolean;
  oauthConnected: boolean;
  producerId: string | null;
  accountName: string | null;
  mappings: Array<{
    id: string; productId: string; offerId: string | null; planId: string | null;
    courseId: string | null; accessDays: number | null; active: boolean;
  }>;
  events: Array<{
    id: string; eventType: string; status: string; attempts: number;
    receivedAt: string; warning: string | null; error: string | null;
  }>;
  plans: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; title: string }>;
};

export async function getEduzzAdminConfig(): Promise<{ success: boolean; data?: EduzzAdminConfig; message?: string }> {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const [integrationResult, mappingsResult, eventsResult, plansResult, coursesResult] = await Promise.all([
      adminClient.from("integrations").select("enabled, status, config, secrets").eq("slug", "eduzz").maybeSingle(),
      adminClient.from("gateway_products")
        .select("id, product_id, offer_id, plan_id, course_id, access_days, is_active")
        .eq("gateway", "eduzz").order("created_at", { ascending: false }),
      adminClient.from("gateway_webhook_events")
        .select("id, event_type, status, attempt_count, received_at, fallback_warning, error_message")
        .eq("gateway", "eduzz").order("received_at", { ascending: false }).limit(30),
      adminClient.from("plans").select("id, name").order("name"),
      adminClient.from("courses").select("id, title").order("title"),
    ]);
    const firstError = [integrationResult.error, mappingsResult.error, eventsResult.error, plansResult.error, coursesResult.error].find(Boolean);
    if (firstError) throw new Error(firstError.message);

    const secrets = asRecord(integrationResult.data?.secrets);
    const config = asRecord(integrationResult.data?.config);
    const webhookSecrets = Array.isArray(secrets.webhookSecrets)
      ? secrets.webhookSecrets.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : typeof secrets.webhookSecret === "string" && secrets.webhookSecret.trim() ? [secrets.webhookSecret] : [];

    return {
      success: true,
      data: {
        enabled: integrationResult.data?.enabled === true,
        status: integrationResult.data?.status ?? "not_started",
        webhookKeyCount: webhookSecrets.length,
        hasClientId: typeof secrets.clientId === "string" && Boolean(secrets.clientId),
        hasClientSecret: typeof secrets.clientSecret === "string" && Boolean(secrets.clientSecret),
        oauthConnected: typeof secrets.accessToken === "string" && Boolean(secrets.accessToken),
        producerId: typeof config.producerId === "string" ? config.producerId : null,
        accountName: typeof config.accountName === "string" ? config.accountName : null,
        mappings: (mappingsResult.data ?? []).map((row) => ({
          id: row.id, productId: row.product_id, offerId: row.offer_id, planId: row.plan_id,
          courseId: row.course_id, accessDays: row.access_days, active: row.is_active,
        })),
        events: (eventsResult.data ?? []).map((row) => ({
          id: row.id, eventType: row.event_type, status: row.status, attempts: row.attempt_count,
          receivedAt: row.received_at, warning: row.fallback_warning, error: row.error_message,
        })),
        plans: plansResult.data ?? [],
        courses: coursesResult.data ?? [],
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function saveEduzzConfiguration(input: {
  enabled?: boolean;
  webhookSecret?: string;
  replaceWebhookSecrets?: boolean;
  clientId?: string;
  clientSecret?: string;
}) {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const { data: existing, error: readError } = await adminClient
      .from("integrations").select("config, secrets, enabled, status").eq("slug", "eduzz").maybeSingle();
    if (readError) throw new Error(readError.message);

    const secrets = { ...asRecord(existing?.secrets) };
    const newSecret = clean(input.webhookSecret);
    if (newSecret) {
      const current = input.replaceWebhookSecrets ? [] : [
        ...(Array.isArray(secrets.webhookSecrets) ? secrets.webhookSecrets : []),
        ...(typeof secrets.webhookSecret === "string" ? [secrets.webhookSecret] : []),
      ];
      secrets.webhookSecrets = Array.from(new Set([...current, newSecret])).slice(-5);
      delete secrets.webhookSecret;
    }
    const clientId = clean(input.clientId);
    const clientSecret = clean(input.clientSecret);
    if (clientId) secrets.clientId = clientId;
    if (clientSecret) secrets.clientSecret = clientSecret;

    const enabled = input.enabled ?? existing?.enabled ?? true;
    const status = enabled
      ? (typeof secrets.accessToken === "string" ? "connected" : existing?.status ?? "webhook_ready")
      : "disabled";
    const { error } = await adminClient.from("integrations").upsert({
      slug: "eduzz", name: "Eduzz", enabled, status,
      config: asRecord(existing?.config), secrets, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function disconnectEduzzOAuth() {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const { data, error: readError } = await adminClient.from("integrations")
      .select("secrets, config").eq("slug", "eduzz").maybeSingle();
    if (readError) throw new Error(readError.message);
    const secrets = { ...asRecord(data?.secrets) };
    delete secrets.accessToken;
    delete secrets.refreshToken;
    delete secrets.tokenExpiresAt;
    const config = { ...asRecord(data?.config) };
    delete config.producerId;
    delete config.accountName;
    const { error } = await adminClient.from("integrations").update({
      secrets, config, status: "needs_reconnect", updated_at: new Date().toISOString(),
    }).eq("slug", "eduzz");
    if (error) throw new Error(error.message);
    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function saveEduzzMapping(input: {
  id?: string; productId: string; offerId?: string; targetType: "plan" | "course";
  targetId: string; accessDays?: number | null;
}) {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const productId = clean(input.productId);
    if (!productId || !input.targetId) throw new Error("Produto e destino são obrigatórios.");
    const row = {
      gateway: "eduzz", product_id: productId, offer_id: clean(input.offerId) ?? null,
      plan_id: input.targetType === "plan" ? input.targetId : null,
      course_id: input.targetType === "course" ? input.targetId : null,
      access_days: input.accessDays && input.accessDays > 0 ? input.accessDays : null,
      is_active: true, updated_at: new Date().toISOString(),
    };
    const query = input.id
      ? adminClient.from("gateway_products").update(row).eq("id", input.id).eq("gateway", "eduzz")
      : adminClient.from("gateway_products").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteEduzzMapping(id: string) {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("gateway_products").delete().eq("id", id).eq("gateway", "eduzz");
    if (error) throw new Error(error.message);
    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function replayEduzzEvent(id: string) {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    await replayEduzzWebhookEvent(adminClient, id);
    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
