"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";
import { sanitizeAssetUrl, sanitizeHexColor } from "@/lib/data/appearance";

export type BrandingImages = {
  logoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
};

export type AppearanceInput = {
  platformName?: string;
  slogan?: string;
  primaryColor?: string;
  theme?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  ogImageUrl?: string | null;
};

export async function saveAppearance(appearanceData: AppearanceInput) {
  try {
    const { adminClient } = await requireAdmin();

    const { data: current } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "appearance")
      .maybeSingle();

    const currentValue = (current?.value as Record<string, unknown> | null) ?? {};

    // Só as chaves conhecidas, cada uma validada: primaryColor vai para um
    // <style> no <head> de todas as páginas e as URLs viram href/src.
    const patch: Record<string, unknown> = {};
    if (typeof appearanceData.platformName === "string") patch.platformName = appearanceData.platformName.trim().slice(0, 120);
    if (typeof appearanceData.slogan === "string") patch.slogan = appearanceData.slogan.slice(0, 300);
    if (typeof appearanceData.theme === "string") patch.theme = appearanceData.theme.slice(0, 40);
    if (appearanceData.primaryColor !== undefined) {
      const color = sanitizeHexColor(appearanceData.primaryColor);
      if (!color) return { success: false, error: "Cor principal inválida. Use o formato hexadecimal, ex.: #3157B7." };
      patch.primaryColor = color;
    }
    for (const key of ["logoUrl", "faviconUrl", "ogImageUrl"] as const) {
      const value = appearanceData[key];
      if (value === undefined) continue;
      if (value === null || value === "") {
        patch[key] = null;
        continue;
      }
      const url = sanitizeAssetUrl(value);
      if (!url) return { success: false, error: "As imagens precisam ser um endereço https." };
      patch[key] = url;
    }

    const merged = {
      ...currentValue,
      ...patch,
    };

    const { error } = await adminClient.from("app_settings").upsert(
      {
        key: "appearance",
        value: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/aparencia");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao salvar aparência.";
    return { success: false, error: message };
  }
}

/**
 * Grava apenas as imagens de marca, preservando os demais campos de `appearance`.
 */
export async function saveBrandingImages(images: BrandingImages) {
  const result = await saveAppearance(images);
  if (!result.success) {
    return { success: false, message: result.error || "Não foi possível salvar as imagens." };
  }
  return { success: true, message: "Imagens da marca atualizadas." };
}
