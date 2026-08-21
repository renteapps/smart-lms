import { DEFAULT_APPEARANCE, type AppearanceConfig } from "@/types/appearance";
import type { DB } from "./types";

export const APPEARANCE_SETTINGS_KEY = "appearance";

/**
 * Lê as configurações de identidade visual e marca da plataforma.
 *
 * A leitura de `app_settings` é pública por RLS para garantir que visitantes
 * e alunos vejam a marca e as cores corretas em toda a aplicação.
 */
export async function getAppearanceConfig(db: DB): Promise<AppearanceConfig> {
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", APPEARANCE_SETTINGS_KEY)
    .maybeSingle();

  if (!data?.value || typeof data.value !== "object") {
    return DEFAULT_APPEARANCE;
  }

  const v = data.value as Record<string, unknown>;

  return {
    platformName:
      typeof v.platformName === "string" && v.platformName.trim()
        ? v.platformName
        : DEFAULT_APPEARANCE.platformName,
    slogan: typeof v.slogan === "string" ? v.slogan : DEFAULT_APPEARANCE.slogan,
    primaryColor:
      typeof v.primaryColor === "string" && v.primaryColor
        ? v.primaryColor
        : DEFAULT_APPEARANCE.primaryColor,
    theme: typeof v.theme === "string" ? v.theme : DEFAULT_APPEARANCE.theme,
    logoUrl: typeof v.logoUrl === "string" ? v.logoUrl : null,
    faviconUrl: typeof v.faviconUrl === "string" ? v.faviconUrl : null,
    ogImageUrl: typeof v.ogImageUrl === "string" ? v.ogImageUrl : null,
  };
}
