"use server";

import { saveSetting } from "@/app/actions/admin/platform";
import { NAVIGATION_SETTINGS_KEY } from "@/lib/data/navigation";
import { parseNavigationConfig } from "@/types/navigation";

/**
 * Grava o menu e o rodapé.
 *
 * O payload do formulário passa pelo mesmo normalizador da leitura antes de
 * virar JSONB: o que entra aqui vira navegação de todo mundo, então nada de
 * confiar no que o client mandou. `saveSetting` já cuida de `requireAdmin`,
 * do upsert e de revalidar o layout raiz.
 */
export async function saveNavigation(config: unknown) {
  return saveSetting(NAVIGATION_SETTINGS_KEY, parseNavigationConfig(config));
}
