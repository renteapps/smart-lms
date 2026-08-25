"use server";

import { revalidatePath } from "next/cache";

import { getHotmartAccessToken, listHotmartProducts, type HotmartProductSummary } from "@/lib/billing/hotmartApi";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/supabase/auth";

/**
 * Ações administrativas da integração Hotmart — mesma forma da Eduzz
 * (`actions/admin/eduzz.ts`), adaptada à autenticação da Hotmart: em vez de
 * OAuth por redirecionamento, é client-credentials direto (Client ID +
 * Client Secret + o token "Basic" que o próprio painel da Hotmart entrega
 * pronto). A tela de integração era um `setTimeout` fingindo conectar; isto é
 * o que faz a conexão acontecer de verdade.
 */

const ADMIN_PATH = "/admin/integracoes/hotmart";

function requireServiceRole() {
  if (!getSupabaseServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor.");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clean(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export type HotmartAdminConfig = {
  enabled: boolean;
  status: string;
  webhookKeyCount: number;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasBasicToken: boolean;
  apiConnected: boolean;
  mappings: Array<{
    id: string; productId: string; offerId: string | null; planId: string | null;
    courseId: string | null; accessDays: number | null; active: boolean;
  }>;
  events: Array<{
    id: string; eventType: string; status: string; receivedAt: string; error: string | null;
  }>;
  plans: Array<{ id: string; name: string }>;
  courses: Array<{ id: string; title: string }>;
};

export async function getHotmartAdminConfig(): Promise<{ success: boolean; data?: HotmartAdminConfig; message?: string }> {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();

    const [integrationResult, mappingsResult, eventsResult, plansResult, coursesResult] = await Promise.all([
      adminClient.from("integrations").select("enabled, status, secrets").eq("slug", "hotmart").maybeSingle(),
      adminClient.from("gateway_products")
        .select("id, product_id, offer_id, plan_id, course_id, access_days, is_active")
        .eq("gateway", "hotmart").order("created_at", { ascending: false }),
      // Só as colunas estáveis: `attempt_count`/`fallback_warning` são específicas
      // do pipeline de sincronização da Eduzz e ainda não existem para todo evento.
      adminClient.from("gateway_webhook_events")
        .select("id, event_type, status, received_at, error_message")
        .eq("gateway", "hotmart").order("received_at", { ascending: false }).limit(30),
      adminClient.from("plans").select("id, name").order("name"),
      adminClient.from("courses").select("id, title").order("title"),
    ]);

    const firstError = [integrationResult.error, mappingsResult.error, eventsResult.error, plansResult.error, coursesResult.error].find(Boolean);
    if (firstError) throw new Error(firstError.message);

    const secrets = asRecord(integrationResult.data?.secrets);
    const webhookSecrets = Array.isArray(secrets.webhookSecrets)
      ? secrets.webhookSecrets.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : typeof secrets.hottok === "string" && secrets.hottok.trim() ? [secrets.hottok] : [];

    return {
      success: true,
      data: {
        enabled: integrationResult.data?.enabled === true,
        status: integrationResult.data?.status ?? "not_started",
        webhookKeyCount: webhookSecrets.length,
        hasClientId: typeof secrets.clientId === "string" && Boolean(secrets.clientId),
        hasClientSecret: typeof secrets.clientSecret === "string" && Boolean(secrets.clientSecret),
        hasBasicToken: typeof secrets.basicToken === "string" && Boolean(secrets.basicToken),
        apiConnected: integrationResult.data?.status === "connected",
        mappings: (mappingsResult.data ?? []).map((row) => ({
          id: row.id, productId: row.product_id, offerId: row.offer_id, planId: row.plan_id,
          courseId: row.course_id, accessDays: row.access_days, active: row.is_active,
        })),
        events: (eventsResult.data ?? []).map((row) => ({
          id: row.id, eventType: row.event_type, status: row.status,
          receivedAt: row.received_at, error: row.error_message,
        })),
        plans: plansResult.data ?? [],
        courses: coursesResult.data ?? [],
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function saveHotmartConfiguration(input: {
  enabled?: boolean;
  hottok?: string;
  replaceWebhookSecrets?: boolean;
  clientId?: string;
  clientSecret?: string;
  basicToken?: string;
}) {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const { data: existing, error: readError } = await adminClient
      .from("integrations").select("secrets, enabled").eq("slug", "hotmart").maybeSingle();
    if (readError) throw new Error(readError.message);

    const secrets = { ...asRecord(existing?.secrets) };

    const newHottok = clean(input.hottok);
    if (newHottok) {
      const current = input.replaceWebhookSecrets ? [] : (Array.isArray(secrets.webhookSecrets) ? secrets.webhookSecrets : []);
      secrets.webhookSecrets = Array.from(new Set([...current, newHottok])).slice(-5);
    }

    const clientId = clean(input.clientId);
    const clientSecret = clean(input.clientSecret);
    const basicToken = clean(input.basicToken);
    if (clientId) secrets.clientId = clientId;
    if (clientSecret) secrets.clientSecret = clientSecret;
    if (basicToken) secrets.basicToken = basicToken;

    const enabled = input.enabled ?? existing?.enabled ?? true;
    let status = enabled ? "webhook_ready" : "disabled";

    /*
     * Credencial nova (ou já existente, se só o toggle mudou): valida na hora
     * pedindo um token de verdade, em vez de deixar o admin descobrir na
     * primeira compra que digitou o Client Secret errado. Só tenta quando há
     * client id/secret disponíveis — parcial não vale a pena testar.
     */
    const effectiveClientId = typeof secrets.clientId === "string" ? secrets.clientId : undefined;
    const effectiveClientSecret = typeof secrets.clientSecret === "string" ? secrets.clientSecret : undefined;
    if (enabled && effectiveClientId && effectiveClientSecret) {
      await getHotmartAccessToken({
        clientId: effectiveClientId,
        clientSecret: effectiveClientSecret,
        basicToken: typeof secrets.basicToken === "string" ? secrets.basicToken : undefined,
      });
      status = "connected";
    }

    const { error } = await adminClient.from("integrations").upsert({
      slug: "hotmart", name: "Hotmart", enabled, status, secrets, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function clearHotmartApiCredentials() {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const { data, error: readError } = await adminClient.from("integrations").select("secrets").eq("slug", "hotmart").maybeSingle();
    if (readError) throw new Error(readError.message);

    const secrets = { ...asRecord(data?.secrets) };
    delete secrets.clientId;
    delete secrets.clientSecret;
    delete secrets.basicToken;

    const { error } = await adminClient.from("integrations").update({
      secrets, status: "needs_reconnect", updated_at: new Date().toISOString(),
    }).eq("slug", "hotmart");
    if (error) throw new Error(error.message);

    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function saveHotmartMapping(input: {
  id?: string; productId: string; offerId?: string; targetType: "plan" | "course";
  targetId: string; accessDays?: number | null;
}) {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const productId = clean(input.productId);
    if (!productId || !input.targetId) throw new Error("Produto e destino são obrigatórios.");

    const row = {
      gateway: "hotmart", product_id: productId, offer_id: clean(input.offerId) ?? null,
      plan_id: input.targetType === "plan" ? input.targetId : null,
      course_id: input.targetType === "course" ? input.targetId : null,
      access_days: input.accessDays && input.accessDays > 0 ? input.accessDays : null,
      is_active: true, updated_at: new Date().toISOString(),
    };
    const query = input.id
      ? adminClient.from("gateway_products").update(row).eq("id", input.id).eq("gateway", "hotmart")
      : adminClient.from("gateway_products").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);

    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteHotmartMapping(id: string) {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("gateway_products").delete().eq("id", id).eq("gateway", "hotmart");
    if (error) throw new Error(error.message);

    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Catálogo de produtos da conta conectada. Sem endpoint de ofertas confirmado
 * na Hotmart (ver `lib/billing/hotmartApi.ts`), então o mapeamento de oferta
 * continua manual — a tela explica isso ao lado do campo.
 */
export async function listHotmartCatalog(): Promise<{ success: boolean; message?: string; data?: HotmartProductSummary[] }> {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();
    const { data, error } = await adminClient.from("integrations").select("secrets").eq("slug", "hotmart").maybeSingle();
    if (error) throw new Error(error.message);

    const secrets = asRecord(data?.secrets);
    const clientId = typeof secrets.clientId === "string" ? secrets.clientId : "";
    const clientSecret = typeof secrets.clientSecret === "string" ? secrets.clientSecret : "";
    if (!clientId || !clientSecret) {
      return { success: false, message: "Configure Client ID e Client Secret da Hotmart antes de listar produtos." };
    }

    const token = await getHotmartAccessToken({
      clientId, clientSecret,
      basicToken: typeof secrets.basicToken === "string" ? secrets.basicToken : undefined,
    });
    const products = await listHotmartProducts({ accessToken: token.accessToken });
    return { success: true, data: products };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
