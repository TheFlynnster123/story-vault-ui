import { d } from "../../../../services/Dependencies";
import type { AnyImageModel, ImageModel } from "./ImageModel";
import { isWorkflowImageModel } from "./ImageModel";
import type { UserImageModels } from "../ImageModelsManagedBlob";
import { imageModelWorkflowConverter } from "../LegacyImageModelWorkflowConverter";

export class ImageModelService {
  readonly DEFAULT_SELECTED_MODEL_ID = "";

  private blob = () => d.ImageModelsManagedBlob();

  public SavePendingChanges = async () =>
    await this.blob().savePendingChanges();

  public async SaveImageModel(model: ImageModel): Promise<boolean> {
    try {
      if (!model.id) {
        d.ErrorService().log(
          "Cannot save image model without a valid ID",
          new Error("Invalid model ID"),
        );
        return false;
      }

      const userImageModels = await this.GetAllImageModels();

      if (this.modelExists(userImageModels.models, model)) {
        const updatedModels = this.updateModel(
          userImageModels.models,
          model,
        );
        await this.saveUserImageModelsDebounced({
          ...userImageModels,
          models: updatedModels,
        });
      } else {
        const newModels = [...userImageModels.models, model];
        await this.saveUserImageModelsDebounced({
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
      const data = await this.blob().get();
      if (!data) return this.createDefaultUserImageModels();
      return {
        ...data,
        models: data.models.map((model) =>
          imageModelWorkflowConverter.classify(model),
        ),
      };
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
        modelId,
      );

      const updatedUserImageModels: UserImageModels = {
        selectedModelId:
          userImageModels.selectedModelId === modelId.toString()
            ? this.DEFAULT_SELECTED_MODEL_ID
            : userImageModels.selectedModelId,
        models: filteredModels,
      };

      await this.saveUserImageModelsDebounced(updatedUserImageModels);
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
    if (!isWorkflowImageModel(selectedModel)) {
      throw new Error("Migrate this legacy image model to workflow before selecting it.");
    }

    const updatedUserImageModels: UserImageModels = {
      ...userImageModels,
      selectedModelId: modelId,
    };

    await this.saveUserImageModelsDebounced(updatedUserImageModels);
    return selectedModel;
  }

  public async getOrDefaultSelectedModel(): Promise<ImageModel> {
    const userImageModels = await this.GetAllImageModels();

    let selectedModel: ImageModel | null = null;
    if (userImageModels.selectedModelId) {
      const found =
        userImageModels.models.find(
          (model) => model.id === userImageModels.selectedModelId,
        ) || null;
      selectedModel = isWorkflowImageModel(found) ? found : null;
    }

    if (!selectedModel) {
      selectedModel =
        userImageModels.models.find(isWorkflowImageModel) ||
        this.createDefaultImageModel();
    }

    return selectedModel;
  }

  public async MigrateImageModelToWorkflow(
    modelId: string,
  ): Promise<ImageModel | null> {
    try {
      const userImageModels = await this.GetAllImageModels();
      const model = this.findModelById(userImageModels.models, modelId);
      if (!model) return null;

      const converted = imageModelWorkflowConverter.convert(model);
      await this.saveUserImageModelsDebounced({
        ...userImageModels,
        models: this.updateAnyModel(userImageModels.models, converted),
      });
      return converted;
    } catch (error) {
      d.ErrorService().log("Failed to migrate image model to workflow", error);
      return null;
    }
  }

  private createDefaultImageModel(): ImageModel {
    return {
      format: "workflow",
      id: "default-image-model",
      name: "Default Image Model",
      timestampUtcMs: Date.now(),
      input: {
        engine: "sdcpp",
        ecosystem: "sdxl",
        operation: "createImage",
        model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
        prompt: "score_9, score_8_up, score_7_up, score_6_up, source_anime",
        negativePrompt:
          "text, logo, watermark, signature, letterbox, bad anatomy, missing limbs, missing fingers, deformed, cropped, lowres, bad hands, jpeg artifacts",
        sampleMethod: "dpm2",
        schedule: "karras",
        steps: 20,
        cfgScale: 7,
        width: 1024,
        height: 1024,
      },
    };
  }

  createDefaultUserImageModels = (): UserImageModels => ({
    selectedModelId: this.DEFAULT_SELECTED_MODEL_ID,
    models: [],
  });

  async saveUserImageModels(userImageModels: UserImageModels): Promise<void> {
    await this.blob().save(userImageModels);
  }

  async saveUserImageModelsDebounced(
    userImageModels: UserImageModels,
  ): Promise<void> {
    await this.blob().saveDebounced(userImageModels);
  }

  modelExists = (models: AnyImageModel[], model: ImageModel): boolean =>
    models.some((existingModel) => existingModel.id === model.id);

  updateModel = (
    models: AnyImageModel[],
    updatedModel: ImageModel,
  ): AnyImageModel[] =>
    models.map((model) =>
      model.id === updatedModel.id ? updatedModel : model,
    );

  updateAnyModel = (
    models: AnyImageModel[],
    updatedModel: AnyImageModel,
  ): AnyImageModel[] =>
    models.map((model) =>
      model.id === updatedModel.id ? updatedModel : model,
    );

  filterOutModel = (models: AnyImageModel[], modelId: string): AnyImageModel[] =>
    models.filter((model) => model.id.toString() !== modelId);

  findModelById = (
    models: AnyImageModel[],
    modelId: string,
  ): AnyImageModel | undefined =>
    models.find((model) => model.id.toString() === modelId);
}

// Re-export for backwards compatibility
export type { UserImageModels } from "../ImageModelsManagedBlob";
