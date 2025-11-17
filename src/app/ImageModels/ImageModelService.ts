import { d } from "../Dependencies/Dependencies";
import type { ImageModel } from "./ImageModel";

export const USER_IMAGE_MODELS_QUERY_KEY = ["user-image-models"];

export class ImageModelService {
  readonly USER_IMAGE_MODELS = "UserImageModels";
  readonly DEFAULT_SELECTED_MODEL_ID = "";

  public async SaveImageModel(model: ImageModel): Promise<boolean> {
    try {
      if (!model.id) {
        d.ErrorService().log(
          "Cannot save image model without a valid ID",
          new Error("Invalid model ID")
        );
        return false;
      }

      // Map the scheduler before saving
      const modelWithMappedScheduler = this.mapSchedulerInModel(model);

      const userImageModels = await this.GetAllImageModels();

      if (this.modelExists(userImageModels.models, modelWithMappedScheduler)) {
        const updatedModels = this.updateModel(
          userImageModels.models,
          modelWithMappedScheduler
        );
        await this.saveUserImageModels({
          ...userImageModels,
          models: updatedModels,
        });
      } else {
        const newModels = [...userImageModels.models, modelWithMappedScheduler];
        await this.saveUserImageModels({
          ...userImageModels,
          models: newModels,
        });
      }

      return true;
    } catch (error) {
      d.ErrorService().log("Failed to save image model", error);
      return false;
    }
  }

  public async GetAllImageModels(): Promise<UserImageModels> {
    try {
      const content = await this.fetchUserImageModelsBlob();

      return content
        ? this.parseUserImageModels(content)
        : this.createDefaultUserImageModels();
    } catch (error) {
      d.ErrorService().log("Failed to get image models", error);
      return this.createDefaultUserImageModels();
    }
  }

  public async DeleteImageModel(modelId: string): Promise<boolean> {
    try {
      const userImageModels = await this.GetAllImageModels();
      const filteredModels = this.filterOutModel(
        userImageModels.models,
        modelId
      );

      const updatedUserImageModels: UserImageModels = {
        selectedModelId:
          userImageModels.selectedModelId === modelId.toString()
            ? this.DEFAULT_SELECTED_MODEL_ID
            : userImageModels.selectedModelId,
        models: filteredModels,
      };

      await this.saveUserImageModels(updatedUserImageModels);
      return true;
    } catch (error) {
      d.ErrorService().log("Failed to delete image model", error);
      return false;
    }
  }

  public async SelectImageModel(modelId: string): Promise<ImageModel> {
    const userImageModels = await this.GetAllImageModels();
    const selectedModel = this.findModelById(userImageModels.models, modelId);

    if (!selectedModel) {
      throw new Error(`Image model with ID ${modelId} not found`);
    }

    const updatedUserImageModels: UserImageModels = {
      ...userImageModels,
      selectedModelId: modelId,
    };

    await this.saveUserImageModels(updatedUserImageModels);
    return selectedModel;
  }

  public async getOrDefaultSelectedModel(): Promise<ImageModel> {
    const userImageModels = await this.GetAllImageModels();

    let selectedModel: ImageModel | null = null;
    if (userImageModels.selectedModelId) {
      selectedModel =
        userImageModels.models.find(
          (model) => model.id === userImageModels.selectedModelId
        ) || null;
    }

    // If no selected model, use the first available model or create a default
    if (!selectedModel) {
      selectedModel =
        userImageModels.models[0] || this.createDefaultImageModel();
    }

    return selectedModel;
  }

  private createDefaultImageModel(): ImageModel {
    return {
      id: "default-image-model",
      name: "Default Image Model",
      timestampUtcMs: Date.now(),
      input: {
        model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
        params: {
          prompt: "score_9, score_8_up, score_7_up, score_6_up, source_anime",
          negativePrompt:
            "text, logo, watermark, signature, letterbox, bad anatomy, missing limbs, missing fingers, deformed, cropped, lowres, bad hands, jpeg artifacts",
          scheduler: "DPM2Karras",
          steps: 20,
          cfgScale: 7,
          width: 1024,
          height: 1024,
          clipSkip: 2,
        },
        additionalNetworks: {},
      },
    };
  }

  async fetchUserImageModelsBlob(): Promise<string | null> {
    return await d.QueryClient().ensureQueryData({
      queryKey: USER_IMAGE_MODELS_QUERY_KEY,
      queryFn: async () => {
        try {
          const blob = await d
            .BlobAPI()
            .getBlob(d.BlobAPI().GLOBAL_CHAT_ID, this.USER_IMAGE_MODELS);
          return blob || null;
        } catch {
          return null;
        }
      },
    });
  }

  parseUserImageModels = (content: string): UserImageModels => {
    try {
      return JSON.parse(content);
    } catch (error) {
      d.ErrorService().log("Failed to parse user image models", error);
      return { selectedModelId: "", models: [] };
    }
  };

  createDefaultUserImageModels = (): UserImageModels => ({
    selectedModelId: this.DEFAULT_SELECTED_MODEL_ID,
    models: [],
  });

  async saveUserImageModels(userImageModels: UserImageModels): Promise<void> {
    await d
      .BlobAPI()
      .saveBlob(
        d.BlobAPI().GLOBAL_CHAT_ID,
        this.USER_IMAGE_MODELS,
        JSON.stringify(userImageModels)
      );

    d.QueryClient().setQueryData(
      USER_IMAGE_MODELS_QUERY_KEY,
      JSON.stringify(userImageModels)
    );
  }

  modelExists = (models: ImageModel[], model: ImageModel): boolean =>
    models.some((existingModel) => existingModel.id === model.id);

  updateModel = (
    models: ImageModel[],
    updatedModel: ImageModel
  ): ImageModel[] =>
    models.map((model) =>
      model.id === updatedModel.id ? updatedModel : model
    );

  filterOutModel = (models: ImageModel[], modelId: string): ImageModel[] =>
    models.filter((model) => model.id.toString() !== modelId);

  findModelById = (
    models: ImageModel[],
    modelId: string
  ): ImageModel | undefined =>
    models.find((model) => model.id.toString() === modelId);

  private mapSchedulerInModel(model: ImageModel): ImageModel {
    try {
      const mappedScheduler = d
        .SchedulerMapper()
        .MapToSchedulerName(model.input.params.scheduler);

      return {
        ...model,
        input: {
          ...model.input,
          params: {
            ...model.input.params,
            scheduler: mappedScheduler,
          },
        },
      };
    } catch (error) {
      // If mapping fails, return the original model unchanged
      return model;
    }
  }
}

export type UserImageModels = {
  selectedModelId: string;
  models: ImageModel[];
};
