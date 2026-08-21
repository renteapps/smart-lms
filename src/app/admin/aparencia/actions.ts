"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

export type BrandingImages = {
  logoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
};

export async function saveAppearance(appearanceData: {
  platformName: string;
  slogan: string;
  primaryColor: string;
  theme: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("app_settings")
    .upsert({
      key: "appearance",
      value: appearanceData,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Grava apenas as imagens de marca, preservando os demais campos de `appearance`.
 * Fica separado de `saveAppearance` porque o upload é imediato: a imagem já subiu
 * para o storage quando o admin confirma, e não faria sentido depender do submit
 * do formulário maior (que hoje nem persiste os outros campos).
 */
export async function saveBrandingImages(images: BrandingImages) {
  try {
    const { adminClient } = await requireAdmin();

    const { data: current } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "appearance")
      .maybeSingle();

    const merged = {
      ...((current?.value as Record<string, unknown> | null) ?? {}),
      logoUrl: images.logoUrl,
      faviconUrl: images.faviconUrl,
      ogImageUrl: images.ogImageUrl,
    };

    const { error } = await adminClient.from("app_settings").upsert({
      key: "appearance",
      value: merged,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true, message: "Imagens da marca atualizadas." };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Não foi possível salvar as imagens.";
    return { success: false, message };
  }
}
