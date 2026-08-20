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

  const minimumCredits = Math.max(
    1,
    Math.trunc(input.minimumCredits ?? 1),
    Math.ceil(0.01 / input.creditValueBrl - 1e-9),
  );
  const providerCostBrl = input.providerCostUsd * input.exchangeRate;
  const protectedCostBrl = providerCostBrl * (1 + input.exchangeBufferPercent / 100);
  const targetRevenueBrl = protectedCostBrl / (1 - input.marginPercent / 100);
  const credits = Math.max(minimumCredits, Math.ceil(targetRevenueBrl / input.creditValueBrl - 1e-9));

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
