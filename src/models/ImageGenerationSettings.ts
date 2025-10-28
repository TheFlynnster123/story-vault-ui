/**
 * LEGACY model sent to CivitAI via the API for image generation.
 */

export interface AdditionalNetwork {
  strength: number;
}

export interface ImageGenerationSettings {
  model: string;
  params: ImageGenerationParams;
  additionalNetworks: Record<string, AdditionalNetwork>;
}

export interface ImageGenerationParams {
  prompt: string;
  negativePrompt: string;
  scheduler: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  clipSkip: number;
}
