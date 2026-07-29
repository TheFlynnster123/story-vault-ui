import { useEffect, useMemo, useState } from "react";
import { d } from "../../../services/Dependencies";
import {
  normalizePlanPresets,
  type PlanPreset,
  type PlanPresets,
} from "../services/PlanPreset";
import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

interface SavePresetArgs {
  id?: string;
  name: string;
  prompt: string;
  model?: string;
  modelRequestSettings?: OpenRouterRequestSettings;
  refreshInterval: number;
  consolidateMessageHistory: boolean;
}

interface UsePlanPresetsResult {
  presets: PlanPreset[];
  isLoading: boolean;
  savePreset: (args: SavePresetArgs) => Promise<PlanPreset>;
  deletePreset: (presetId: string) => Promise<void>;
}

const DEFAULT_VALUE: PlanPresets = { presets: [] };

const normalizePresetName = (name: string) => name.trim();
const isSameName = (a: string, b: string) =>
  normalizePresetName(a).toLowerCase() === normalizePresetName(b).toLowerCase();

export const usePlanPresets = (): UsePlanPresetsResult => {
  const [data, setData] = useState<PlanPresets>(DEFAULT_VALUE);
  const [isLoading, setIsLoading] = useState(true);

  const blob = () => d.PlanPresetsManagedBlob();

  useEffect(() => {
    const managedBlob = blob();
    const load = async () => {
      const stored = await managedBlob.get();
      setData(normalizePlanPresets(stored));
      setIsLoading(false);
    };
    const unsubscribe = managedBlob.subscribe(() => {
      void load();
    });

    void load();

    return () => {
      unsubscribe();
    };
  }, []);

  const presets = useMemo(() => {
    return [...(data.presets || [])].sort(
      (a, b) => b.updatedAtUtcMs - a.updatedAtUtcMs,
    );
  }, [data.presets]);

  const savePreset: UsePlanPresetsResult["savePreset"] = async ({
    id,
    name,
    prompt,
    model,
    modelRequestSettings,
    refreshInterval,
    consolidateMessageHistory,
  }) => {
    const now = Date.now();
    const trimmedName = normalizePresetName(name);
    const stored = normalizePlanPresets(await blob().get());
    const existingIndex = stored.presets.findIndex(
      (p: PlanPreset) => p.id === id,
    );

    const updatedPresets = [...stored.presets];
    let savedId = id;

    if (id && existingIndex >= 0) {
      updatedPresets[existingIndex] = {
        ...updatedPresets[existingIndex],
        name: trimmedName,
        prompt,
        model,
        modelRequestSettings,
        refreshInterval,
        consolidateMessageHistory,
        updatedAtUtcMs: now,
      };
    } else {
      const generatedId = crypto.randomUUID();
      const newPreset: PlanPreset = {
        id: generatedId,
        name: trimmedName,
        prompt,
        model,
        modelRequestSettings,
        refreshInterval,
        consolidateMessageHistory,
        createdAtUtcMs: now,
        updatedAtUtcMs: now,
      };
      updatedPresets.push(newPreset);
      savedId = generatedId;
    }

    const savedPreset = updatedPresets.find(
      (p: PlanPreset) => p.id === savedId,
    );
    if (!savedPreset) {
      throw new Error("Failed to save preset");
    }

    await blob().save({ presets: updatedPresets });
    return savedPreset;
  };

  const deletePreset: UsePlanPresetsResult["deletePreset"] = async (
    presetId: string,
  ) => {
    const stored = normalizePlanPresets(await blob().get());
    await blob().save({
      presets: stored.presets.filter((p: PlanPreset) => p.id !== presetId),
    });
  };

  return {
    presets,
    isLoading,
    savePreset,
    deletePreset,
  };
};

export const getPlanPresetByName = (
  presets: PlanPreset[],
  name: string,
): PlanPreset | undefined => presets.find((p) => isSameName(p.name, name));
