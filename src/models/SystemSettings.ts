import type { ChatGenerationSettings } from "./ChatGenerationSettings";

export interface ImageGenerationParams {
  prompt: string;
  prompt: string;
  negativePrompt: string;
  scheduler: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  clipSkip: number;
}

export interface AdditionalNetwork {
  strength: number;
}

export interface ImageGenerationSettings {
  model: string;
  params: ImageGenerationParams;
  additionalNetworks: Record<string, AdditionalNetwork>;
}

export interface SystemSettings {
  chatGenerationSettings?: ChatGenerationSettings;
  imageGenerationSettings?: ImageGenerationSettings;
}
