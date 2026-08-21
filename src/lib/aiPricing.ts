export type AiPricingInput = {
  providerCostUsd: number;
  exchangeRate: number;
  exchangeBufferPercent: number;
  marginPercent: number;
  creditValueBrl: number;
  minimumCredits?: number;
};

export type AiPriceBreakdown = {
  providerCostBrl: number;
  protectedCostBrl: number;
  nominalRevenueBrl: number;
  credits: number;
};

const finiteNonNegative = (value: number) => Number.isFinite(value) && value >= 0;

/** Arredonda para 4 casas decimais (mesma precisão de `numeric(14,4)` no banco). */
export function roundCredits(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10000) / 10000;
}

export function calculateAiPrice(input: AiPricingInput): AiPriceBreakdown {
  if (
    !finiteNonNegative(input.providerCostUsd)
    || !Number.isFinite(input.exchangeRate)
    || input.exchangeRate <= 0
    || !finiteNonNegative(input.exchangeBufferPercent)
    || !finiteNonNegative(input.marginPercent)
    || input.marginPercent >= 100
    || !Number.isFinite(input.creditValueBrl)
    || input.creditValueBrl <= 0
  ) {
    throw new Error("Configuração de preço de IA inválida.");
  }

  const minimumCredits = Math.max(0, roundCredits(input.minimumCredits ?? 0));
  const providerCostBrl = input.providerCostUsd * input.exchangeRate;
  const protectedCostBrl = providerCostBrl * (1 + input.exchangeBufferPercent / 100);
  const targetRevenueBrl = protectedCostBrl / (1 - input.marginPercent / 100);
  const credits = Math.max(minimumCredits, roundCredits(targetRevenueBrl / input.creditValueBrl));

  return {
    providerCostBrl,
    protectedCostBrl,
    nominalRevenueBrl: credits * input.creditValueBrl,
    credits,
  };
}

export function calculateTokenCostUsd(
  promptTokens: number,
  completionTokens: number,
  promptUsdPerMillion: number,
  completionUsdPerMillion: number,
) {
  const prompt = Math.max(0, Math.trunc(promptTokens));
  const completion = Math.max(0, Math.trunc(completionTokens));
  return (prompt * promptUsdPerMillion + completion * completionUsdPerMillion) / 1_000_000;
}

export function estimateMessagesTokens(messages: Array<{ content: string }>) {
  const characters = messages.reduce((total, message) => total + message.content.length, 0);
  return Math.max(1, Math.ceil(characters / 4));
}
