export type ExpirationOption = "indefinite" | "30d" | "90d" | "180d" | "365d" | "custom";

/**
 * Calcula a data de expiração (ISO string) baseada na opção selecionada.
 * Retorna `null` para acesso vitalício / indeterminado.
 */
export function calculateExpiresAt(
  type: ExpirationOption,
  customDate?: string | null,
  baseDate: Date = new Date()
): string | null {
  if (type === "indefinite") {
    return null;
  }

  if (type === "custom") {
    if (!customDate) {
      throw new Error("Data personalizada não informada.");
    }
    // Suporta 'YYYY-MM-DD' ou string ISO
    const parsed = new Date(customDate);
    if (isNaN(parsed.getTime())) {
      throw new Error("Data personalizada inválida.");
    }
    // Se for formato de data apenas (YYYY-MM-DD), define para o final do dia
    if (/^\d{4}-\d{2}-\d{2}$/.test(customDate.trim())) {
      const [year, month, day] = customDate.trim().split("-").map(Number);
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      return endOfDay.toISOString();
    }
    return parsed.toISOString();
  }

  const daysMap: Record<string, number> = {
    "30d": 30,
    "90d": 90,
    "180d": 180,
    "365d": 365,
  };

  const daysToAdd = daysMap[type];
  if (!daysToAdd) {
    throw new Error(`Opção de duração inválida: ${type}`);
  }

  const result = new Date(baseDate.getTime());
  result.setUTCDate(result.getUTCDate() + daysToAdd);
  result.setUTCHours(23, 59, 59, 999);
  return result.toISOString();
}
