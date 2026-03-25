import type { ImageModel } from "./ImageModel";
import type {
  GeneratedImage,
  GeneratedImageAspectRatio,
} from "./GeneratedImage";
import type { FromTextInput } from "civitai/dist/types/Inputs";
import { v4 as uuidv4 } from "uuid";
import { d } from "../../../../services/Dependencies";

export class ImageModelMapper {
  private readonly MAX_DIMENSION = 1024;

  FromGeneratedImage = (generatedData: GeneratedImage): ImageModel => ({
    id: uuidv4().toString(),
    timestampUtcMs: Date.now(),
    name: this.generateModelName(generatedData),
    input: this.mapToFromTextInput(generatedData),
    trainedWords: this.extractAllTrainedWords(generatedData),
  });

  generateModelName(generatedData: GeneratedImage): string {
    const primaryResource = this.getPrimaryResource(generatedData);
    const baseNumber = generatedData.remixOf.id;

    if (primaryResource) {
      return `${primaryResource.name} - ${baseNumber}`;
    }

    return `Generated Model ${baseNumber}`;
  }

  getPrimaryResource = (generatedData: GeneratedImage) =>
    generatedData.resources.find((resource) =>
      this.isCheckpoint(resource.model.type),
    ) || generatedData.resources[0];

  isCheckpoint = (type: string): boolean => type.toLowerCase() === "checkpoint";

  mapToFromTextInput(generatedData: GeneratedImage): FromTextInput {
    const primaryResource = this.getPrimaryResource(generatedData);
    const isCheckpoint = primaryResource
      ? this.isCheckpoint(primaryResource.model.type)
      : false;
    const firstResourceBaseModel = generatedData.resources[0]?.baseModel;

    const modelAir = this.resolveModelAir(
      primaryResource,
      isCheckpoint,
      firstResourceBaseModel,
    );

    const { width, height } = this.resolveWidthHeight(generatedData.params);

    return {
      model: modelAir,
      params: {
        prompt: generatedData.params.prompt,
        negativePrompt: generatedData.params.negativePrompt,
        scheduler: d
          .SchedulerMapper()
          .MapToSchedulerName(generatedData.params.sampler ?? "Euler a"),
        steps: generatedData.params.steps,
        cfgScale: generatedData.params.cfgScale,
        width: this.truncateDimension(width),
        height: this.truncateDimension(height),
        clipSkip: this.defaultClipSkip(generatedData.params.clipSkip),
      },
      additionalNetworks: this.mapAdditionalNetworks(generatedData),
    };
  }

  resolveModelAir(
    primaryResource: ReturnType<typeof this.getPrimaryResource>,
    isCheckpoint: boolean,
    firstResourceBaseModel: string | undefined,
  ): string {
    if (!isCheckpoint || !primaryResource) {
      return firstResourceBaseModel
        ? d.BaseModelMapper().toAIR(firstResourceBaseModel)
        : "";
    }

    if (
      !primaryResource.canGenerate &&
      primaryResource.substitute?.canGenerate
    ) {
      return primaryResource.substitute.air;
    }

    return primaryResource.air;
  }

  private truncateDimension = (dimension: number): number =>
    Math.min(dimension, this.MAX_DIMENSION);

  private defaultClipSkip = (clipSkip: number | undefined): number =>
    clipSkip ?? 2;

  resolveWidthHeight(params: GeneratedImage["params"]): {
    width: number;
    height: number;
  } {
    if (
      params.aspectRatio &&
      typeof params.aspectRatio === "object" &&
      "width" in params.aspectRatio
    ) {
      const ar = params.aspectRatio as GeneratedImageAspectRatio;
      return { width: ar.width, height: ar.height };
    }

    return {
      width: params.width ?? 512,
      height: params.height ?? 512,
    };
  }

  extractAllTrainedWords(generatedData: GeneratedImage): string[] {
    const allWords = generatedData.resources.flatMap(
      (resource) => resource.trainedWords ?? [],
    );
    return [...new Set(allWords)];
  }

  mapAdditionalNetworks(generatedData: GeneratedImage) {
    const primaryResource = this.getPrimaryResource(generatedData);
    const primaryResourceIsCheckpoint = primaryResource
      ? this.isCheckpoint(primaryResource.model.type)
      : false;

    return generatedData.resources.reduce(
      (networks, resource) => {
        if (primaryResourceIsCheckpoint && resource === primaryResource) {
          return networks;
        }

        networks[resource.air] = {
          strength: resource.strength,
        };
        return networks;
      },
      {} as Record<string, { strength: number }>,
    );
  }
}
