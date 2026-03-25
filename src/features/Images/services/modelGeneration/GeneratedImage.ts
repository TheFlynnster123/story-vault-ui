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

export type GeneratedImageResourceSubstitute = {
  air: string;
  name: string;
  canGenerate: boolean;
  strength: number;
};

export type GeneratedImageResource = {
  /* The unique identifier for the resource eg urn:air:sdxl:checkpoint:civitai:000000@000000 */
  air: string;
  name: string;
  strength: number;
  minStrength: number;
  maxStrength: number;
  trainedWords: string[];
  canGenerate: boolean;
  model: {
    name: string;
    type: string;
  };
  baseModel?: string;
  substitute?: GeneratedImageResourceSubstitute;
};

export type GeneratedImageAspectRatio = {
  value: string;
  width: number;
  height: number;
};

export type GeneratedImageParams = {
  prompt: string;
  negativePrompt: string;
  cfgScale: number;
  steps: number;
  sampler?: string;
  width?: number;
  height?: number;
  aspectRatio?: string | GeneratedImageAspectRatio;
  clipSkip: number;
};
