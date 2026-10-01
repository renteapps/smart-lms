/** Abas de /admin/onboarding — fora do client component para a página (servidor) poder ler `?aba=`. */

export type OnboardingTab = 'questions' | 'preview' | 'stats' | 'history';

/** Valor de `?aba=` de cada aba — dá para recarregar ou mandar o link da aba certa. */
export const ONBOARDING_TAB_PARAMS: Record<OnboardingTab, string> = {
  questions: 'perguntas',
  preview: 'previa',
  stats: 'saude',
  history: 'historico',
};

export function parseOnboardingTab(value: string | string[] | undefined): OnboardingTab {
  const param = Array.isArray(value) ? value[0] : value;
  const match = (Object.entries(ONBOARDING_TAB_PARAMS) as Array<[OnboardingTab, string]>).find(([, slug]) => slug === param);
  return match?.[0] ?? 'questions';
}
