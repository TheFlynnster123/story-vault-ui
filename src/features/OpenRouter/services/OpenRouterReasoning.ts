export const OPENROUTER_REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

export type OpenRouterReasoningEffort =
  (typeof OPENROUTER_REASONING_EFFORTS)[number];

export interface OpenRouterReasoningConfig {
  effort?: OpenRouterReasoningEffort;
}

export const supportsReasoning = (
  supportedParameters: string[] | undefined,
): boolean => supportedParameters?.includes("reasoning") ?? false;
