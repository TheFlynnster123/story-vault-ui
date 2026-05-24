/**
 * Input type for the CivitAI Orchestration API imageGen step.
 * Replaces the legacy FromTextInput from the civitai SDK.
 *
 * Reference: https://developer.civitai.com/orchestration/recipes/sdxl
 */
export type ImageGenEngine = "sdcpp" | "comfy";
export type ImageGenEcosystem = "sdxl" | "sd1";
export type ImageGenOperation = "createImage" | "createVariant";

export type ImageGenInput = {
  engine: ImageGenEngine;
  ecosystem: ImageGenEcosystem;
  operation: ImageGenOperation;

  /** AIR URN of the checkpoint model, e.g. urn:air:sdxl:checkpoint:civitai:101055@128078 */
  model: string;

  prompt: string;
  negativePrompt?: string;

  width: number;
  height: number;

  steps?: number;
  cfgScale?: number;

  /**
   * Sampler method for sdcpp engine.
   * Not used when engine is "comfy" (use `sampler` instead).
   */
  sampleMethod?: string;

  /**
   * Schedule for sdcpp engine (e.g. "karras", "discrete").
   * Leave undefined to use the orchestration API default.
   */
  schedule?: string;

  /**
   * Sampler for comfy engine.
   * Not used when engine is "sdcpp" (use `sampleMethod` instead).
   */
  sampler?: string;

  /**
   * Scheduler for comfy engine (e.g. "karras", "normal").
   * Not used when engine is "sdcpp".
   */
  scheduler?: string;

  /**
   * CLIP skip layers — SD1 only.
   * Must NOT be sent for SDXL or Flux (returns 400).
   */
  clipSkip?: number;

  seed?: number;
  quantity?: number;

  /**
   * LoRA networks to apply. Keys are AIR URNs; values are strength (0.0–1.0).
   * e.g. { "urn:air:sdxl:lora:civitai:123456@789012": 0.8 }
   */
  loras?: Record<string, number>;
};

/** A single step in an orchestration workflow submission */
export type ImageGenStep = {
  $type: "imageGen";
  input: ImageGenInput;
};
