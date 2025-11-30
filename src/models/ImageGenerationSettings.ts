/**
 * LEGACY model sent to CivitAI via the API for image generation.
 */

interface AdditionalNetwork {
  strength: number;
}

export interface ImageGenerationSettings {
  model: string;
  params: ImageGenerationParams;
  additionalNetworks: Record<string, AdditionalNetwork>;
}

interface ImageGenerationParams {
  prompt: string;
  negativePrompt: string;
  scheduler: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  clipSkip: number;
}
