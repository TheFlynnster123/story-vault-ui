import { d } from "../Dependencies/Dependencies";
import type { ImageModel } from "./ImageModel";

export class ImageModelService {
  readonly USER_IMAGE_MODELS = "UserImageModels";
  readonly DEFAULT_SELECTED_MODEL_ID = "";

  public async SaveImageModel(model: ImageModel): Promise<boolean> {
    try {
      const userImageModels = await this.GetAllImageModels();

      if (this.modelExists(userImageModels.models, model)) {
        const updatedModels = this.updateModel(userImageModels.models, model);
        await this.saveUserImageModels({
          ...userImageModels,
          models: updatedModels,
        });
      } else {
        const newModels = [...userImageModels.models, model];
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

  async fetchUserImageModelsBlob(): Promise<string | null> {
    try {
      const blob = await d
        .BlobAPI()
        .getBlob(d.BlobAPI().GLOBAL_CHAT_ID, this.USER_IMAGE_MODELS);
      return blob || null;
    } catch {
      return null;
    }
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
}

export type UserImageModels = {
  selectedModelId: string;
  models: ImageModel[];
};
