import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

import { DEFAULT_PLAN_PROMPT, DEFAULT_REFRESH_INTERVAL } from "./Plan";

export interface PlanPreset {
  id: string;
  name: string;
  prompt: string;
  model?: string;
  modelRequestSettings?: OpenRouterRequestSettings;
  suggestionPrompt?: string;
  suggestionModel?: string;
  suggestionRequestSettings?: OpenRouterRequestSettings;
  refreshInterval: number;
  consolidateMessageHistory: boolean;
  createdAtUtcMs: number;
  updatedAtUtcMs: number;
}

export interface PlanPresets {
  presets: PlanPreset[];
}

export const normalizePlanPreset = (preset: PlanPreset): PlanPreset => ({
  id: preset.id,
  name: preset.name,
  prompt: preset.prompt,
  model: preset.model,
  modelRequestSettings: preset.modelRequestSettings,
  suggestionPrompt: preset.suggestionPrompt,
  suggestionModel: preset.suggestionModel,
  suggestionRequestSettings: preset.suggestionRequestSettings,
  refreshInterval: preset.refreshInterval,
  consolidateMessageHistory: preset.consolidateMessageHistory,
  createdAtUtcMs: preset.createdAtUtcMs,
  updatedAtUtcMs: preset.updatedAtUtcMs,
});

export const normalizePlanPresets = (
  presets: PlanPresets | undefined,
): PlanPresets => ({
  presets: (presets?.presets ?? []).map(normalizePlanPreset),
});

export const STORY_PLAN_PRESET_ID = "default-story-plan";

export const STORY_PLAN_BUILT_IN_PRESET: PlanPreset = {
  id: STORY_PLAN_PRESET_ID,
  name: "Story Plan",
  prompt: DEFAULT_PLAN_PROMPT,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  consolidateMessageHistory: false,
  createdAtUtcMs: 0,
  updatedAtUtcMs: 0,
};
