"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

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

    const merged = {
      ...currentValue,
      ...appearanceData,
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
