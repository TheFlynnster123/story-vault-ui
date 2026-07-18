import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";
import { d } from "../../../services/Dependencies";

export interface ModelPreset {
  id: string;
  name: string;
  modelId: string;
  requestSettings?: OpenRouterRequestSettings;
  createdAtUtcMs: number;
  updatedAtUtcMs: number;
}

export interface ModelPresets {
  presets: ModelPreset[];
}

export interface SaveModelPreset {
  id?: string;
  name: string;
  modelId: string;
  requestSettings?: OpenRouterRequestSettings;
}

const DEFAULT_VALUE: ModelPresets = { presets: [] };

export class ModelPresetsService {
  private blob = () => d.ModelPresetsManagedBlob();

  async getPresets(): Promise<ModelPreset[]> {
    const stored = (await this.blob().get()) ?? DEFAULT_VALUE;
    return [...stored.presets].sort(
      (a, b) => b.updatedAtUtcMs - a.updatedAtUtcMs,
    );
  }

  subscribe(callback: () => void): () => void {
    return this.blob().subscribe(callback);
  }

  async savePreset({
    id,
    name,
    modelId,
    requestSettings,
  }: SaveModelPreset): Promise<ModelPreset> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Preset name is required");
    }

    const stored = (await this.blob().get()) ?? DEFAULT_VALUE;
    const presets = stored.presets;
    const existingPreset = id
      ? presets.find((preset) => preset.id === id)
      : undefined;
    const now = Date.now();
    const savedPreset: ModelPreset = {
      id: existingPreset?.id ?? crypto.randomUUID(),
      name: trimmedName,
      modelId,
      requestSettings,
      createdAtUtcMs: existingPreset?.createdAtUtcMs ?? now,
      updatedAtUtcMs: now,
    };
    const updatedPresets = existingPreset
      ? presets.map((preset) =>
          preset.id === savedPreset.id ? savedPreset : preset,
        )
      : [...presets, savedPreset];

    await this.blob().save({ presets: updatedPresets });
    return savedPreset;
  }

  async deletePreset(presetId: string): Promise<void> {
    const stored = (await this.blob().get()) ?? DEFAULT_VALUE;
    await this.blob().save({
      presets: stored.presets.filter((preset) => preset.id !== presetId),
    });
  }
}
