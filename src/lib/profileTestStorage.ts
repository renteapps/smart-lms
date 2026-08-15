import type { ProfileCategory, ProfileTest } from '@/types/profileTest';

/**
 * Resultados dos testes de perfil.
 *
 * O `ProfileTestRunner` calculava a categoria vencedora, mostrava na tela e
 * jogava fora — `onComplete()` só marcava a aula como concluída. Era o sinal de
 * personalização mais forte que a plataforma já coletava, e nada o guardava.
 */

export const PROFILE_TEST_STORAGE_KEY = '@smartlms:profile-tests:v1';

export type ProfileTestScore = {
  categoryId: string;
  categoryName: string;
  percentage: number;
};

export type ProfileTestResult = {
  testId: string;
  testTitle: string;
  /** Categoria vencedora. */
  categoryId: string;
  categoryName: string;
  scores: ProfileTestScore[];
  completedAt: string;
};

export type ProfileTestResults = {
  formatVersion: 1;
  results: ProfileTestResult[];
};

function empty(): ProfileTestResults {
  return { formatVersion: 1, results: [] };
}

export function readProfileTestResults(rawInput?: string | null): ProfileTestResults {
  if (rawInput === undefined && typeof window === 'undefined') return empty();
  const raw = rawInput === undefined ? window.localStorage.getItem(PROFILE_TEST_STORAGE_KEY) : rawInput;
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw) as ProfileTestResults;
    return parsed.formatVersion === 1 && Array.isArray(parsed.results) ? parsed : empty();
  } catch {
    return empty();
  }
}

/** Um resultado por teste: refazer substitui o anterior. */
export function saveProfileTestResult(result: ProfileTestResult): void {
  if (typeof window === 'undefined') return;
  const current = readProfileTestResults();
  window.localStorage.setItem(
    PROFILE_TEST_STORAGE_KEY,
    JSON.stringify({
      formatVersion: 1,
      results: [...current.results.filter((item) => item.testId !== result.testId), result],
    } satisfies ProfileTestResults),
  );
}

export function getProfileTestResult(
  testId: string,
  results = readProfileTestResults(),
): ProfileTestResult | null {
  return results.results.find((item) => item.testId === testId) ?? null;
}

/** Monta o registro a partir do que o runner já calculou. */
export function buildProfileTestResult(
  test: Pick<ProfileTest, 'id' | 'title'>,
  winner: ProfileCategory,
  scores: Array<{ category: ProfileCategory; percentage: number }>,
  now = new Date(),
): ProfileTestResult {
  return {
    testId: test.id,
    testTitle: test.title,
    categoryId: winner.id,
    categoryName: winner.name,
    scores: scores.map(({ category, percentage }) => ({
      categoryId: category.id,
      categoryName: category.name,
      percentage,
    })),
    completedAt: now.toISOString(),
  };
}
