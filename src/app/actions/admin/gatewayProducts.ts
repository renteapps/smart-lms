"use server";

import { listEduzzProductOffers, listEduzzProducts, type EduzzOfferSummary, type EduzzProductSummary } from "@/lib/billing/eduzzProducts";
import { loadGatewayWebhookConfig } from "@/lib/billing/secrets";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/supabase/auth";

/**
 * "Lista de Produtos": em vez de digitar o ID do produto de cabeça no
 * formulário de mapeamento, o admin folheia o catálogo de verdade da conta
 * conectada. Complementa `saveEduzzMapping`/`saveEduzzMapping` — este arquivo
 * só lê da API do gateway, nunca escreve no `gateway_products`.
 */

function requireServiceRole() {
  if (!getSupabaseServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor.");
  }
}

export type CatalogResult<T> = { success: boolean; message?: string; data?: T };

export async function listEduzzCatalog(page = 1): Promise<CatalogResult<{
  items: EduzzProductSummary[]; page: number; pages: number; totalItems: number;
}>> {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();

    const config = await loadGatewayWebhookConfig(adminClient, "eduzz");
    if (!config.apiAccessToken) {
      return { success: false, message: "Conecte a conta Eduzz via OAuth antes de listar produtos." };
    }

    const result = await listEduzzProducts({ accessToken: config.apiAccessToken, page });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function listEduzzOffersForProduct(productId: string): Promise<CatalogResult<EduzzOfferSummary[]>> {
  try {
    requireServiceRole();
    const { adminClient } = await requireAdmin();

    if (!productId.trim()) return { success: false, message: "Informe o produto." };

    const config = await loadGatewayWebhookConfig(adminClient, "eduzz");
    if (!config.apiAccessToken) {
      return { success: false, message: "Conecte a conta Eduzz via OAuth antes de listar ofertas." };
    }

    const offers = await listEduzzProductOffers({ accessToken: config.apiAccessToken, productId: productId.trim() });
    return { success: true, data: offers };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
