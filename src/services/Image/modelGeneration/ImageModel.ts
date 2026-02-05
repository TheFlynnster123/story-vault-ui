import type { FromTextInput } from "civitai/dist/types/Inputs";

export type ImageModel = {
  id: string;
  name: string;
  timestampUtcMs: number;

  /**
   * The image input parameters used to generate an image via CivitAI.
   */
  input: FromTextInput;

  /**
   * The job ID for the sample image generated for this model.
   */
  sampleImageId?: string;

  /**
   * Optional LLM prompt that instructs the AI how to describe scenes for image generation.
   * If not set, falls back to the system-level defaultImagePrompt.
   */
  imageGenerationPrompt?: string;
};
