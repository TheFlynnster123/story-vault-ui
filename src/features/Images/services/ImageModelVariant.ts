import type { FromTextInput } from "civitai/dist/types/Inputs";
import type { ImageModel } from "./modelGeneration/ImageModel";

export type ImageModelVariantOverrides = {
  input?: {
    model?: string;
    params?: Partial<FromTextInput["params"]>;
    additionalNetworks?: NonNullable<FromTextInput["additionalNetworks"]>;
  };
  sampleImageId?: string;
  imageGenerationPrompt?: string;
  appendImageGenerationPromptToBase?: boolean;
  trainedWords?: string[];
};

export type ImageModelVariant = {
  id: string;
  name: string;
  parentModelId: string;
  timestampUtcMs: number;
  overrides: ImageModelVariantOverrides;
};

export const resolveVariant = (
  variant: ImageModelVariant,
  parent: ImageModel,
): ImageModel => {
  const o = variant.overrides;
  return {
    id: variant.id,
    name: variant.name,
    timestampUtcMs: variant.timestampUtcMs,
    input: {
      ...parent.input,
      ...(o.input?.model !== undefined ? { model: o.input.model } : {}),
      params: {
        ...parent.input.params,
        ...o.input?.params,
      },
      ...(o.input?.additionalNetworks !== undefined
        ? { additionalNetworks: o.input.additionalNetworks }
        : {}),
    },
    sampleImageId:
      "sampleImageId" in o ? o.sampleImageId : parent.sampleImageId,
    imageGenerationPrompt:
      "imageGenerationPrompt" in o
        ? o.imageGenerationPrompt
        : parent.imageGenerationPrompt,
    appendImageGenerationPromptToBase:
      "appendImageGenerationPromptToBase" in o
        ? o.appendImageGenerationPromptToBase
        : parent.appendImageGenerationPromptToBase,
    trainedWords: "trainedWords" in o ? o.trainedWords : parent.trainedWords,
  };
};

export type OverriddenFields = {
  sampleImageId: boolean;
  imageGenerationPrompt: boolean;
  appendImageGenerationPromptToBase: boolean;
  trainedWords: boolean;
  inputModel: boolean;
  inputParams: Partial<
    Record<keyof NonNullable<FromTextInput["params"]>, boolean>
  >;
  inputAdditionalNetworks: boolean;
};

export const computeOverriddenFields = (
  overrides: ImageModelVariantOverrides,
): OverriddenFields => ({
  sampleImageId: "sampleImageId" in overrides,
  imageGenerationPrompt: "imageGenerationPrompt" in overrides,
  appendImageGenerationPromptToBase:
    "appendImageGenerationPromptToBase" in overrides,
  trainedWords: "trainedWords" in overrides,
  inputModel: overrides.input !== undefined && "model" in overrides.input,
  inputParams: Object.fromEntries(
    Object.keys(overrides.input?.params ?? {}).map((k) => [k, true]),
  ),
  inputAdditionalNetworks:
    overrides.input !== undefined && "additionalNetworks" in overrides.input,
});
