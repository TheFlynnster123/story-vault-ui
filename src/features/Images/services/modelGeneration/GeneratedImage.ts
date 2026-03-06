/**
 * The model representing a generated image and its associated parameters and resources.
 * This data comes from the endpoint https://civitai.com/api/generation/data?type=image&id=[number]
 */
export type GeneratedImage = {
  type: "image" | any;
  remixOf: {
    id: number;
  };
  resources: GeneratedImageResource[];
  params: GeneratedImageParams;
};

export type GeneratedImageResource = {
  /* The unique identifier for the resource eg urn:air:sdxl:checkpoint:civitai:000000@000000 */
  air: string;
  name: string;
  strength: number;
  minStrength: number;
  maxStrength: number;
  model: {
    name: string;
    type: "LORA" | "CHECKPOINT";
  };
  baseModel?: string;
};

export type GeneratedImageParams = {
  prompt: string;
  negativePrompt: string;
  cfgScale: number;
  steps: number;
  sampler: "DPM++ 2M" | "Euler a";
  width: number;
  height: number;
  aspectRatio: string;
  clipSkip: number;
};
