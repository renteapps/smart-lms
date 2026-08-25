export type PlanFrequencyLike = "monthly" | "yearly" | "lifetime" | "custom" | null | undefined;

/**
 * Até quando vai o acesso concedido por uma compra.
 *
 * Precedência, da fonte mais confiável para a menos:
 *
 *  1. **A data que o gateway mandou** (`date_next_charge` na Hotmart,
 *     `nextDueDate` na Eduzz). É quem cobra que sabe até quando está pago.
 *  2. **`gateway_products.access_days`**, o prazo cadastrado na oferta — é o
 *     caso do curso avulso vendido com 365 dias de acesso.
 *  3. **A frequência do plano**, como último recurso.
 *
 * `null` significa acesso sem prazo: é assim que `enrollments.expires_at` e
 * `subscriptions.current_period_end` representam vitalício, e todas as regras de
 * acesso já tratam `null` como "não expira".
 */

/**
 * Soma meses sem o pulo de mês do JavaScript: `new Date(2026,0,31)` mais um mês
 * vira 3 de março, não 28 de fevereiro. Aqui o dia é limitado ao último dia do
 * mês de destino.
 */
export function addMonthsUtc(base: Date, months: number): Date {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();

  const lastDayOfTarget = new Date(Date.UTC(year, month + months + 1, 0)).getUTCDate();

  return new Date(Date.UTC(
    year,
    month + months,
    Math.min(day, lastDayOfTarget),
    base.getUTCHours(),
    base.getUTCMinutes(),
    base.getUTCSeconds(),
    base.getUTCMilliseconds(),
  ));
}

export function resolveAccessEnd(input: {
  gatewayPeriodEnd?: string | null;
  accessDays?: number | null;
  frequency?: PlanFrequencyLike;
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();

  if (input.gatewayPeriodEnd) {
    const parsed = new Date(input.gatewayPeriodEnd);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  if (typeof input.accessDays === "number" && Number.isFinite(input.accessDays) && input.accessDays > 0) {
    const end = new Date(now.getTime());
    end.setUTCDate(end.getUTCDate() + Math.floor(input.accessDays));
    end.setUTCHours(23, 59, 59, 999);
    return end.toISOString();
  }

  switch (input.frequency) {
    case "monthly":
      return addMonthsUtc(now, 1).toISOString();
    case "yearly":
      return addMonthsUtc(now, 12).toISOString();
    case "lifetime":
      return null;
    // `custom` sem `access_days` cadastrado não tem prazo dedutível: quem
    // define é o gateway, e se ele não mandou nada o acesso fica sem prazo.
    default:
      return null;
  }
}

/**
 * Data de corte de uma revogação.
 *
 * `now` corta na hora (reembolso, chargeback). `period_end` preserva o período
 * já pago — e, se não houver período conhecido, cai para o corte imediato: sem
 * data não dá para "esperar o fim" de coisa nenhuma.
 */
export function resolveRevocationEnd(input: {
  mode: "now" | "period_end";
  currentPeriodEnd?: string | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  if (input.mode === "now") return now.toISOString();

  if (input.currentPeriodEnd) {
    const parsed = new Date(input.currentPeriodEnd);
    if (!Number.isNaN(parsed.getTime()) && parsed > now) return parsed.toISOString();
  }

  return now.toISOString();
}
