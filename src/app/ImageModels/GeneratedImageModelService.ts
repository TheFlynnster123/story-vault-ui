import type { ImageModel } from "./ImageModel";
import type { GeneratedImageModel } from "./GeneratedImageModel";
import type { FromTextInput } from "civitai/dist/types/Inputs";
import { d } from "../Dependencies/Dependencies";
import { SchedulerMapper } from "./SchedulerMapper";

export class GeneratedImageModelService {
  private schedulerMapper = new SchedulerMapper();

  public async GenerateImageModel(imageId: string): Promise<ImageModel | null> {
    try {
      const generatedImageData = await this.fetchGeneratedImageData(imageId);
      return this.mapToImageModel(generatedImageData);
    } catch (error) {
      d.ErrorService().log("Failed to generate image model", error);
      return null;
    }
  }

  async fetchGeneratedImageData(imageId: string): Promise<GeneratedImageModel> {
    const url = this.buildApiUrl(imageId);
    const response = await this.makeApiRequest(url);

    if (!response) {
      throw new Error("Failed to fetch data from API");
    }

    const parsedData = await this.parseResponse(response);
    if (!parsedData) {
      throw new Error("Failed to parse response data");
    }

    return parsedData;
  }

  buildApiUrl = (imageId: string): string =>
    `https://civitai.com/api/generation/data?type=image&id=${imageId}`;

  async makeApiRequest(url: string): Promise<Response | null> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      d.ErrorService().log(
        `Failed to fetch image data: ${response.status} ${response.statusText}`,
        new Error(`HTTP ${response.status}`)
      );
      return null;
    }

    return response;
  }

  async parseResponse(response: Response): Promise<GeneratedImageModel | null> {
    try {
      return await response.json();
    } catch (error) {
      d.ErrorService().log("Failed to parse response", error);
      return null;
    }
  }

  mapToImageModel = (generatedData: GeneratedImageModel): ImageModel => ({
    id: generatedData.remixOf.id,
    name: this.generateModelName(generatedData),
    input: this.mapToFromTextInput(generatedData),
  });

  generateModelName(generatedData: GeneratedImageModel): string {
    const primaryResource = this.getPrimaryResource(generatedData);
    const baseNumber = generatedData.remixOf.id;

    if (primaryResource) {
      return `${primaryResource.name} - ${baseNumber}`;
    }

    return `Generated Model ${baseNumber}`;
  }

  getPrimaryResource = (generatedData: GeneratedImageModel) =>
    generatedData.resources.find(
      (resource) => resource.model.type === "CHECKPOINT"
    ) || generatedData.resources[0];

  mapToFromTextInput(generatedData: GeneratedImageModel): FromTextInput {
    const primaryResource = this.getPrimaryResource(generatedData);

    return {
      model: primaryResource?.air || "",
      params: {
        prompt: generatedData.params.prompt,
        negativePrompt: generatedData.params.negativePrompt,
        scheduler: this.schedulerMapper.MapScheduler(
          generatedData.params.sampler
        ),
        steps: generatedData.params.steps,
        cfgScale: generatedData.params.cfgScale,
        width: generatedData.params.width,
        height: generatedData.params.height,
        clipSkip: generatedData.params.clipSkip,
      },
      additionalNetworks: this.mapAdditionalNetworks(generatedData),
    };
  }

  mapAdditionalNetworks(generatedData: GeneratedImageModel) {
    return generatedData.resources.reduce((networks, resource) => {
      networks[resource.air] = {
        strength: resource.strength,
      };
      return networks;
    }, {} as Record<string, { strength: number }>);
  }
}
