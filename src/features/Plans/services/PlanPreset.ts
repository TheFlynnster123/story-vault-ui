import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

import { DEFAULT_PLAN_PROMPT, DEFAULT_REFRESH_INTERVAL } from "./Plan";

export interface PlanPreset {
  id: string;
  name: string;
  prompt: string;
  model?: string;
  modelRequestSettings?: OpenRouterRequestSettings;
  refreshInterval: number;
  consolidateMessageHistory: boolean;
  hideOtherPlans: boolean;
  excludeOwnPlanFromHistory: boolean;
  createdAtUtcMs: number;
  updatedAtUtcMs: number;
}

export interface PlanPresets {
  presets: PlanPreset[];
}

export const STORY_PLAN_PRESET_ID = "default-story-plan";

export const STORY_PLAN_BUILT_IN_PRESET: PlanPreset = {
  id: STORY_PLAN_PRESET_ID,
  name: "Story Plan",
  prompt: DEFAULT_PLAN_PROMPT,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  consolidateMessageHistory: false,
  hideOtherPlans: false,
  excludeOwnPlanFromHistory: false,
  createdAtUtcMs: 0,
  updatedAtUtcMs: 0,
};
