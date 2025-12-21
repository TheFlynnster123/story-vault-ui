import type { ImageModel } from "./ImageModel";
import type { GeneratedImage } from "./GeneratedImage";
import type { FromTextInput } from "civitai/dist/types/Inputs";
import { v4 as uuidv4 } from "uuid";
import { d } from "../Dependencies/Dependencies";

export class ImageModelMapper {
  private readonly MAX_DIMENSION = 1024;

  FromGeneratedImage = (generatedData: GeneratedImage): ImageModel => ({
    id: uuidv4().toString(),
    timestampUtcMs: Date.now(),
    name: this.generateModelName(generatedData),
    input: this.mapToFromTextInput(generatedData),
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
    generatedData.resources.find(
      (resource) => resource.model.type === "CHECKPOINT"
    ) || generatedData.resources[0];

  mapToFromTextInput(generatedData: GeneratedImage): FromTextInput {
    const primaryResource = this.getPrimaryResource(generatedData);
    const isCheckpoint = primaryResource?.model.type === "CHECKPOINT";
    const firstResourceBaseModel = generatedData.resources[0]?.baseModel;

    const modelAir = isCheckpoint
      ? primaryResource.air
      : firstResourceBaseModel
      ? d.BaseModelMapper().toAIR(firstResourceBaseModel)
      : "";

    return {
      model: modelAir,
      params: {
        prompt: generatedData.params.prompt,
        negativePrompt: generatedData.params.negativePrompt,
        scheduler: d
          .SchedulerMapper()
          .MapToSchedulerName(generatedData.params.sampler),
        steps: generatedData.params.steps,
        cfgScale: generatedData.params.cfgScale,
        width: this.truncateDimension(generatedData.params.width),
        height: this.truncateDimension(generatedData.params.height),
        clipSkip: this.defaultClipSkip(generatedData.params.clipSkip),
      },
      additionalNetworks: this.mapAdditionalNetworks(generatedData),
    };
  }

  private truncateDimension = (dimension: number): number =>
    Math.min(dimension, this.MAX_DIMENSION);

  private defaultClipSkip = (clipSkip: number | undefined): number =>
    clipSkip ?? 2;

  mapAdditionalNetworks(generatedData: GeneratedImage) {
    const primaryResource = this.getPrimaryResource(generatedData);
    const primaryResourceIsCheckpoint =
      primaryResource?.model.type === "CHECKPOINT";

    return generatedData.resources.reduce((networks, resource) => {
      // If we have a checkpoint, exclude it from additional networks
      // If no checkpoint (using BaseModelMapper), include all resources
      if (primaryResourceIsCheckpoint && resource === primaryResource) {
        return networks;
      }

      networks[resource.air] = {
        strength: resource.strength,
      };
      return networks;
    }, {} as Record<string, { strength: number }>);
  }
}
