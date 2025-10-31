import type { ImageModel } from "./ImageModel";
import type { GeneratedImage } from "./GeneratedImage";
import type { FromTextInput } from "civitai/dist/types/Inputs";
import { v4 as uuidv4 } from "uuid";

export class ImageModelMapper {
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

    return {
      model: primaryResource?.air || "",
      params: {
        prompt: generatedData.params.prompt,
        negativePrompt: generatedData.params.negativePrompt,
        scheduler: generatedData.params.sampler,
        steps: generatedData.params.steps,
        cfgScale: generatedData.params.cfgScale,
        width: generatedData.params.width,
        height: generatedData.params.height,
        clipSkip: generatedData.params.clipSkip,
      },
      additionalNetworks: this.mapAdditionalNetworks(generatedData),
    };
  }

  mapAdditionalNetworks(generatedData: GeneratedImage) {
    const primaryResource = this.getPrimaryResource(generatedData);

    return generatedData.resources.reduce((networks, resource) => {
      if (resource === primaryResource) {
        return networks;
      }

      networks[resource.air] = {
        strength: resource.strength,
      };
      return networks;
    }, {} as Record<string, { strength: number }>);
  }
}
