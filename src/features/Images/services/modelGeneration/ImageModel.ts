import type { ImageGenInput } from "../api/ImageGenInput";

export type ImageModel = {
  format?: "workflow";
  id: string;
  name: string;
  timestampUtcMs: number;

  /**
   * The image input parameters used to generate an image via the CivitAI Orchestration API.
   */
  input: ImageGenInput;

  /**
   * The workflow ID for the sample image generated for this model.
   * Prefixed with "wf_" for orchestration API workflows.
   */
  sampleWorkflowId?: string;

  /**
   * Optional LLM prompt that instructs the AI how to describe scenes for image generation.
   * If not set, falls back to the system-level defaultImagePrompt.
   */
  imageGenerationPrompt?: string;

  /**
   * When true, imageGenerationPrompt is appended to the system-level defaultImagePrompt
   * instead of replacing it.
   */
  appendImageGenerationPromptToBase?: boolean;

  /**
   * Trained words from additional model resources (e.g. LoRAs).
   * These can be toggled on/off by the user in the prompt editor.
   */
  trainedWords?: string[];
};

export type LegacyJobImageModel = Omit<ImageModel, "format" | "input"> & {
  format: "legacy-job";
  input: unknown;
  sampleImageId?: string;
  legacyReason?: string;
};

export type AnyImageModel = ImageModel | LegacyJobImageModel;

export const isWorkflowImageModel = (
  model: AnyImageModel | null | undefined,
): model is ImageModel => !!model && model.format === "workflow";

export const isLegacyJobImageModel = (
  model: AnyImageModel | null | undefined,
): model is LegacyJobImageModel => !!model && model.format === "legacy-job";
