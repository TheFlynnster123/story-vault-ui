import type { ImageModel } from "./ImageModel";
import type { ImageGenInput, ImageGenEcosystem } from "../api/ImageGenInput";
import type {
  GeneratedImage,
} from "./GeneratedImage";
import { v4 as uuidv4 } from "uuid";
import { d } from "../../../../services/Dependencies";

export class ImageModelMapper {
  private readonly MAX_DIMENSION = 1024;

  FromGeneratedImage = (generatedData: GeneratedImage): ImageModel => ({
    id: uuidv4().toString(),
    timestampUtcMs: Date.now(),
    name: this.generateModelName(generatedData),
    input: this.mapToImageGenInput(generatedData),
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

  mapToImageGenInput(generatedData: GeneratedImage): ImageGenInput {
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

    const ecosystem = resolveEcosystem(modelAir);
    const { width, height } = this.resolveWidthHeight(generatedData.params);
    const samplerParams = d
      .SchedulerMapper()
      .MapToSampleMethodParams(generatedData.params.sampler ?? "Euler a");

    const input: ImageGenInput = {
      engine: "sdcpp",
      ecosystem,
      operation: "createImage",
      model: modelAir,
      prompt: generatedData.params.prompt,
      negativePrompt: generatedData.params.negativePrompt,
      sampleMethod: samplerParams.sampleMethod,
      schedule: samplerParams.schedule,
      steps: generatedData.params.steps,
      cfgScale: generatedData.params.cfgScale,
      width: this.truncateDimension(width),
      height: this.truncateDimension(height),
      loras: this.mapLoras(generatedData),
    };

    if (ecosystem === "anima" && !input.schedule) {
      input.schedule = "simple";
    }

    if (ecosystem === "sd1") {
      input.clipSkip = this.defaultClipSkip(generatedData.params.clipSkip);
    }

    return input;
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
      const ar = params.aspectRatio as { width: number; height: number };
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

  mapLoras(generatedData: GeneratedImage): Record<string, number> {
    const primaryResource = this.getPrimaryResource(generatedData);
    const primaryResourceIsCheckpoint = primaryResource
      ? this.isCheckpoint(primaryResource.model.type)
      : false;

    return generatedData.resources.reduce(
      (loras, resource) => {
        if (primaryResourceIsCheckpoint && resource === primaryResource) {
          return loras;
        }
        loras[resource.air] = resource.strength;
        return loras;
      },
      {} as Record<string, number>,
    );
  }

  /** @deprecated Use mapToImageGenInput instead */
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

const resolveEcosystem = (airUrn: string): ImageGenEcosystem => {
  if (airUrn.startsWith("urn:air:anima:")) return "anima";
  if (airUrn.startsWith("urn:air:sd1:")) return "sd1";
  return "sdxl";
};
