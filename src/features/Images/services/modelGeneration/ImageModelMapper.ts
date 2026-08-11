import type { ImageModel } from "./ImageModel";
import type {
  ImageGenInput,
  KreaAspectRatio,
} from "../api/ImageGenInput";
import type { GeneratedImage } from "./GeneratedImage";
import { v4 as uuidv4 } from "uuid";
import { d } from "../../../../services/Dependencies";
import { resolveImageGenerationTarget } from "./ImageGenerationTargetResolver";

export class ImageModelMapper {
  private readonly MAX_SD_DIMENSION = 1024;
  private readonly MAX_ZIMAGE_DIMENSION = 2048;

  FromGeneratedImage = (generatedData: GeneratedImage): ImageModel => {
    const input = this.mapToImageGenInput(generatedData);
    const importWarnings = this.getImportWarnings(generatedData, input);

    return {
      format: "workflow",
      id: uuidv4().toString(),
      timestampUtcMs: Date.now(),
      name: this.generateModelName(generatedData),
      input,
      trainedWords:
        input.engine === "fal"
          ? []
          : this.extractAllTrainedWords(generatedData),
      ...(importWarnings.length > 0 ? { importWarnings } : {}),
    };
  };

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

    const target = resolveImageGenerationTarget({
      resources: generatedData.resources,
      resolvedModelAir: modelAir,
      paramsModel: generatedData.params.Model,
    });
    const ecosystem = target.ecosystem;
    const { width, height } = this.resolveWidthHeight(generatedData.params);

    if (target.ecosystem === "krea2") {
      return {
        engine: "fal",
        ecosystem: "krea2",
        operation: "createImage",
        model: target.model,
        prompt: generatedData.params.prompt,
        size: "medium",
        aspectRatio: toKreaAspectRatio(width, height),
        creativity: "medium",
        seed: generatedData.params.seed ?? undefined,
      };
    }

    const samplerParams = d
      .SchedulerMapper()
      .MapToSampleMethodParams(generatedData.params.sampler ?? "Euler a");

    const input: ImageGenInput = {
      engine: "sdcpp",
      ecosystem,
      operation: "createImage",
      prompt: generatedData.params.prompt,
      negativePrompt: generatedData.params.negativePrompt,
      sampleMethod: samplerParams.sampleMethod,
      schedule: samplerParams.schedule,
      steps:
        generatedData.params.steps ??
        (ecosystem === "zImage" ? zImageDefaults(target.model).steps : undefined),
      cfgScale:
        generatedData.params.cfgScale ??
        (ecosystem === "zImage"
          ? zImageDefaults(target.model).cfgScale
          : undefined),
      width: this.truncateDimension(width, ecosystem),
      height: this.truncateDimension(height, ecosystem),
      loras: this.mapLoras(generatedData),
      seed: generatedData.params.seed ?? undefined,
    };

    if (target.ecosystem === "anima") {
      input.diffuserModel = target.diffuserModel;
    } else {
      input.model = target.model;
    }

    if ((ecosystem === "anima" || ecosystem === "zImage") && !input.schedule) {
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

  private truncateDimension = (
    dimension: number,
    ecosystem: ImageGenInput["ecosystem"],
  ): number =>
    Math.min(
      dimension,
      ecosystem === "zImage"
        ? this.MAX_ZIMAGE_DIMENSION
        : this.MAX_SD_DIMENSION,
    );

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

  getImportWarnings(
    generatedData: GeneratedImage,
    input: ImageGenInput,
  ): string[] {
    if (input.engine !== "fal" || input.model !== "krea2") return [];

    const warnings: string[] = [];
    if (
      generatedData.resources.some(
        (resource) => resource.model.type.toLowerCase() === "lora",
      )
    ) {
      warnings.push(
        "The source Krea 2 LoRA is not supported by the hosted Krea recipe and was omitted.",
      );
    }
    if (generatedData.params.negativePrompt?.trim()) {
      warnings.push(
        "Krea 2 does not support negative prompts, so the source negative prompt was omitted.",
      );
    }
    if (generatedData.params.Model) {
      warnings.push(
        "The source checkpoint and sampler settings were converted to hosted Krea 2 defaults.",
      );
    }

    return warnings;
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

const zImageDefaults = (model: "turbo" | "base") =>
  model === "base"
    ? { cfgScale: 4, steps: 20 }
    : { cfgScale: 1, steps: 9 };

const KREA_ASPECT_RATIOS: Array<{
  value: KreaAspectRatio;
  ratio: number;
}> = [
  { value: "1:1", ratio: 1 },
  { value: "4:3", ratio: 4 / 3 },
  { value: "3:2", ratio: 3 / 2 },
  { value: "16:9", ratio: 16 / 9 },
  { value: "2.35:1", ratio: 2.35 },
  { value: "4:5", ratio: 4 / 5 },
  { value: "2:3", ratio: 2 / 3 },
  { value: "9:16", ratio: 9 / 16 },
];

export const toKreaAspectRatio = (
  width: number,
  height: number,
): KreaAspectRatio => {
  const ratio = width / height;
  return KREA_ASPECT_RATIOS.reduce((nearest, candidate) =>
    Math.abs(Math.log(ratio / candidate.ratio)) <
    Math.abs(Math.log(ratio / nearest.ratio))
      ? candidate
      : nearest,
  ).value;
};
