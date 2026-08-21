import { parseNavigationConfig, type NavigationConfig } from "@/types/navigation";
import type { DB } from "./types";

export const NAVIGATION_SETTINGS_KEY = "navigation";

/**
 * Lê o menu e o rodapé configurados no admin.
 *
 * A leitura de `app_settings` é pública por RLS, então isso funciona também
 * para visitante — o header não pode depender de sessão para saber que links
 * mostrar.
 */
export async function getNavigationConfig(db: DB): Promise<NavigationConfig> {
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", NAVIGATION_SETTINGS_KEY)
    .maybeSingle();

  return parseNavigationConfig(data?.value);
}
