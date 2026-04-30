import { useEffect, useMemo, useState } from "react";
import { d } from "../../../services/Dependencies";
import type {
  ChatPromptPreset,
  ChatPromptPresets,
} from "../services/ChatPromptPresets";

interface UseChatPromptPresetsResult {
  presets: ChatPromptPreset[];
  isLoading: boolean;
  savePreset: (args: {
    id?: string;
    name: string;
    prompt: string;
  }) => Promise<ChatPromptPreset>;
  deletePreset: (presetId: string) => Promise<void>;
}

const DEFAULT_VALUE: ChatPromptPresets = { presets: [] };

const normalizePresetName = (name: string) => name.trim();
const isSameName = (a: string, b: string) =>
  normalizePresetName(a).toLowerCase() === normalizePresetName(b).toLowerCase();

export const useChatPromptPresets = (): UseChatPromptPresetsResult => {
  const [data, setData] = useState<ChatPromptPresets>(DEFAULT_VALUE);
  const [isLoading, setIsLoading] = useState(true);

  const blob = () => d.ChatPromptPresetsManagedBlob();

  const load = async () => {
    const stored = await blob().get();
    setData(stored || DEFAULT_VALUE);
    setIsLoading(false);
  };

  useEffect(() => {
    const unsubscribe = blob().subscribe(() => {
      load();
    });

    load();

    return () => {
      unsubscribe();
    };
  }, []);

  const presets = useMemo(() => {
    return [...(data.presets || [])].sort(
      (a, b) => b.updatedAtUtcMs - a.updatedAtUtcMs,
    );
  }, [data.presets]);

  const savePreset: UseChatPromptPresetsResult["savePreset"] = async ({
    id,
    name,
    prompt,
  }) => {
    const now = Date.now();
    const trimmedName = normalizePresetName(name);
    const stored = (await blob().get()) || DEFAULT_VALUE;
    const existingIndex = stored.presets.findIndex(
      (p: ChatPromptPreset) => p.id === id,
    );

    const updatedPresets = [...stored.presets];

    if (id && existingIndex >= 0) {
      updatedPresets[existingIndex] = {
        ...updatedPresets[existingIndex],
        name: trimmedName,
        prompt,
        updatedAtUtcMs: now,
      };
    } else {
      const generatedId = crypto.randomUUID();
      const newPreset: ChatPromptPreset = {
        id: generatedId,
        name: trimmedName,
        prompt,
        createdAtUtcMs: now,
        updatedAtUtcMs: now,
      };
      updatedPresets.push(newPreset);
      id = generatedId;
    }

    const savedPreset = updatedPresets.find((p: ChatPromptPreset) => p.id === id);
    if (!savedPreset) {
      throw new Error("Failed to save preset");
    }

    await blob().save({ presets: updatedPresets });
    return savedPreset;
  };

  const deletePreset: UseChatPromptPresetsResult["deletePreset"] = async (
    presetId: string,
  ) => {
    const stored = (await blob().get()) || DEFAULT_VALUE;
    await blob().save({
      presets: stored.presets.filter((p: ChatPromptPreset) => p.id !== presetId),
    });
  };

  return {
    presets,
    isLoading,
    savePreset,
    deletePreset,
  };
};

export const getPresetByName = (
  presets: ChatPromptPreset[],
  name: string,
): ChatPromptPreset | undefined =>
  presets.find((p) => isSameName(p.name, name));
