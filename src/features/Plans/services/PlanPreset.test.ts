import { describe, expect, it } from "vitest";
import {
  normalizePlanPreset,
  normalizePlanPresets,
  type PlanPreset,
} from "./PlanPreset";

const legacyPreset = {
  id: "preset-1",
  name: "Story Plan",
  prompt: "Plan the story.",
  model: "model",
  suggestionPrompt: "Suggest updates.",
  refreshInterval: 5,
  consolidateMessageHistory: true,
  createdAtUtcMs: 10,
  updatedAtUtcMs: 20,
  hideOtherPlans: true,
  excludeOwnPlanFromHistory: true,
} as unknown as PlanPreset;

describe("PlanPreset normalization", () => {
  it("retains supported fields and removes legacy context fields", () => {
    expect(normalizePlanPreset(legacyPreset)).toEqual({
      id: "preset-1",
      name: "Story Plan",
      prompt: "Plan the story.",
      model: "model",
      modelRequestSettings: undefined,
      suggestionPrompt: "Suggest updates.",
      suggestionModel: undefined,
      suggestionRequestSettings: undefined,
      refreshInterval: 5,
      consolidateMessageHistory: true,
      createdAtUtcMs: 10,
      updatedAtUtcMs: 20,
    });
  });

  it("normalizes every stored preset and defaults missing storage", () => {
    expect(normalizePlanPresets({ presets: [legacyPreset] }).presets).toEqual([
      normalizePlanPreset(legacyPreset),
    ]);
    expect(normalizePlanPresets(undefined)).toEqual({ presets: [] });
  });
});
