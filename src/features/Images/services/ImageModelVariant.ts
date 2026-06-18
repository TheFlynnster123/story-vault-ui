import type { ImageGenInput, WorkflowPriority } from "./api/ImageGenInput";
import type { ImageModel } from "./modelGeneration/ImageModel";
import { isWorkflowImageModel } from "./modelGeneration/ImageModel";

export type ImageModelVariantOverrides = {
  input?: Partial<ImageGenInput>;
  sampleWorkflowId?: string;
  imageGenerationPrompt?: string;
  appendImageGenerationPromptToBase?: boolean;
  trainedWords?: string[];
  priority?: WorkflowPriority;
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
  if (!isWorkflowImageModel(parent)) {
    throw new Error("Migrate the parent image model before using this variant.");
  }

  const o = variant.overrides;
  return {
    id: variant.id,
    name: variant.name,
    timestampUtcMs: variant.timestampUtcMs,
    input: {
      ...parent.input,
      ...o.input,
    },
    sampleWorkflowId:
      "sampleWorkflowId" in o ? o.sampleWorkflowId : parent.sampleWorkflowId,
    imageGenerationPrompt:
      "imageGenerationPrompt" in o
        ? o.imageGenerationPrompt
        : parent.imageGenerationPrompt,
    appendImageGenerationPromptToBase:
      "appendImageGenerationPromptToBase" in o
        ? o.appendImageGenerationPromptToBase
        : parent.appendImageGenerationPromptToBase,
    trainedWords: "trainedWords" in o ? o.trainedWords : parent.trainedWords,
    priority: "priority" in o ? o.priority : parent.priority,
  };
};

export type OverriddenFields = {
  sampleWorkflowId: boolean;
  imageGenerationPrompt: boolean;
  appendImageGenerationPromptToBase: boolean;
  trainedWords: boolean;
  priority: boolean;
  inputModel: boolean;
  inputParams: Partial<Record<keyof ImageGenInput, boolean>>;
  inputLoras: boolean;
};

export const computeOverriddenFields = (
  overrides: ImageModelVariantOverrides,
): OverriddenFields => ({
  sampleWorkflowId: "sampleWorkflowId" in overrides,
  imageGenerationPrompt: "imageGenerationPrompt" in overrides,
  appendImageGenerationPromptToBase:
    "appendImageGenerationPromptToBase" in overrides,
  trainedWords: "trainedWords" in overrides,
  priority: "priority" in overrides,
  inputModel: overrides.input !== undefined && "model" in overrides.input,
  inputParams: Object.fromEntries(
    Object.keys(overrides.input ?? {})
      .filter((k) => k !== "model" && k !== "loras")
      .map((k) => [k, true]),
  ),
  inputLoras: overrides.input !== undefined && "loras" in overrides.input,
});
