import type { OpenRouterModel } from "./OpenRouterModelsAPI";
import type {
  OpenRouterReasoningConfig,
  OpenRouterReasoningEffort,
} from "./OpenRouterReasoning";
import { supportsReasoning } from "./OpenRouterReasoning";

export const OPENROUTER_ADVANCED_PARAMETER_KEYS = [
  "reasoning",
  "temperature",
  "top_p",
  "max_tokens",
  "frequency_penalty",
  "presence_penalty",
  "repetition_penalty",
  "seed",
] as const;

export type OpenRouterAdvancedParameterKey =
  (typeof OPENROUTER_ADVANCED_PARAMETER_KEYS)[number];

export interface OpenRouterRequestSettings {
  reasoning?: OpenRouterReasoningConfig;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  seed?: number;
}

export const supportsParameter = (
  model: OpenRouterModel | undefined,
  parameter: OpenRouterAdvancedParameterKey,
): boolean =>
  parameter === "reasoning"
    ? supportsReasoning(model?.supported_parameters)
    : (model?.supported_parameters?.includes(parameter) ?? false);

export const filterSettingsForModel = (
  settings: OpenRouterRequestSettings | undefined,
  model: OpenRouterModel | undefined,
): OpenRouterRequestSettings | undefined => {
  if (!settings) return undefined;

  const filtered: OpenRouterRequestSettings = {};
  for (const key of OPENROUTER_ADVANCED_PARAMETER_KEYS) {
    if (!supportsParameter(model, key)) continue;
    const value = settings[key];
    if (value !== undefined) {
      (filtered as Record<string, unknown>)[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
};

export const hasOpenRouterRequestSettings = (
  settings: OpenRouterRequestSettings | undefined,
): boolean =>
  !!settings &&
  OPENROUTER_ADVANCED_PARAMETER_KEYS.some((key) => settings[key] !== undefined);

export type { OpenRouterReasoningEffort };
