import type { OpenRouterModel } from "./OpenRouterModelsAPI";

/** Characters-per-token ratio used for estimation (industry standard approximation). */
const CHARS_PER_TOKEN = 4;

export interface PricingEstimate {
  /** Estimated cost of input tokens in USD */
  inputCost: number;
  /** Estimated cost of output tokens in USD */
  outputCost: number;
  /** Total estimated cost in USD */
  totalCost: number;
  /** Estimated number of input tokens */
  inputTokens: number;
  /** Estimated number of output tokens */
  outputTokens: number;
}

const charsToTokens = (chars: number): number => chars / CHARS_PER_TOKEN;

const parsePricingRate = (value: string | undefined): number | null => {
  if (value === undefined || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

const findModel = (
  models: OpenRouterModel[],
  modelId: string,
): OpenRouterModel | undefined => models.find((m) => m.id === modelId);

/**
 * Estimates the USD cost of an LLM request using cached OpenRouter model pricing.
 *
 * Pricing is based on a 4-characters-per-token approximation. The models list is
 * supplied via a provider function so that it always reads the latest cached data
 * without coupling this service to React Query directly.
 */
export class ModelPricingEstimator {
  private readonly modelsProvider: () => OpenRouterModel[];

  constructor(modelsProvider: () => OpenRouterModel[]) {
    this.modelsProvider = modelsProvider;
  }

  /**
   * Estimate the cost for a request.
   *
   * Returns `null` when:
   * - `modelId` is undefined
   * - The model is not found in the cached model list
   * - The model has no pricing data, or pricing values cannot be parsed
   */
  estimateCost(
    modelId: string | undefined,
    inputChars: number,
    outputChars: number,
  ): PricingEstimate | null {
    if (!modelId) return null;

    const models = this.modelsProvider();
    const model = findModel(models, modelId);
    if (!model) return null;

    const promptRate = parsePricingRate(model.pricing?.prompt);
    const completionRate = parsePricingRate(model.pricing?.completion);

    if (promptRate === null || completionRate === null) return null;

    const inputTokens = charsToTokens(inputChars);
    const outputTokens = charsToTokens(outputChars);

    const inputCost = inputTokens * promptRate;
    const outputCost = outputTokens * completionRate;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      inputTokens,
      outputTokens,
    };
  }
}
