import { cache } from "react";
import { DEFAULT_APPEARANCE, type AppearanceConfig } from "@/types/appearance";
import type { DB } from "./types";

export const APPEARANCE_SETTINGS_KEY = "appearance";

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * `primaryColor` é interpolado dentro de um `<style>` no `<head>` de todas as
 * páginas (app/layout.tsx): qualquer coisa além de uma cor hex permitiria
 * fechar o `</style>` e injetar script para todos os visitantes.
 */
export function sanitizeHexColor(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOR.test(value.trim()) ? value.trim() : null;
}

/** Só https ou caminho relativo do próprio site — nada de javascript:/data:. */
export function sanitizeAssetUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Lê as configurações de identidade visual e marca da plataforma.
 *
 * A leitura de `app_settings` é pública por RLS para garantir que visitantes
 * e alunos vejam a marca e as cores corretas em toda a aplicação.
 */
export const getAppearanceConfig = cache(async (db: DB): Promise<AppearanceConfig> => {
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
    primaryColor: sanitizeHexColor(v.primaryColor) ?? DEFAULT_APPEARANCE.primaryColor,
    theme: typeof v.theme === "string" ? v.theme : DEFAULT_APPEARANCE.theme,
    logoUrl: sanitizeAssetUrl(v.logoUrl),
    faviconUrl: sanitizeAssetUrl(v.faviconUrl),
    ogImageUrl: sanitizeAssetUrl(v.ogImageUrl),
  };
});
