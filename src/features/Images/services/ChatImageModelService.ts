import { d } from "../../../services/Dependencies";
import type { AnyImageModel, ImageModel } from "./modelGeneration/ImageModel";
import { isWorkflowImageModel } from "./modelGeneration/ImageModel";
import type { ChatImageModels } from "./ChatImageModelsManagedBlob";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import { imageModelWorkflowConverter } from "./LegacyImageModelWorkflowConverter";

export const getChatImageModelServiceInstance = createInstanceCache(
  (chatId: string) => new ChatImageModelService(chatId),
);

export class ChatImageModelService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  private blob = () => d.ChatImageModelsManagedBlob(this.chatId);

  // ---- Public API ----

  public SavePendingChanges = async () =>
    await this.blob().savePendingChanges();

  public async GetAll(): Promise<ChatImageModels> {
    const data = await this.blob().get();
    if (!data) return this.createEmpty();
    return {
      ...data,
      models: data.models.map((model) =>
        imageModelWorkflowConverter.classify(model),
      ),
    };
  }

  public async SaveModel(model: ImageModel): Promise<boolean> {
    try {
      if (!model.id) {
        d.ErrorService().log(
          "Cannot save chat image model without a valid ID",
          new Error("Invalid model ID"),
        );
        return false;
      }

      const chatImageModels = await this.GetAll();

      if (this.modelExists(chatImageModels.models, model.id)) {
        const updatedModels = this.updateModel(chatImageModels.models, model);
        await this.saveDebounced({ ...chatImageModels, models: updatedModels });
      } else {
        const newModels = [...chatImageModels.models, model];
        await this.saveDebounced({ ...chatImageModels, models: newModels });
      }

      return true;
    } catch (error) {
      d.ErrorService().log("Failed to save chat image model", error);
      return false;
    }
  }

  public async DeleteModel(modelId: string): Promise<boolean> {
    try {
      const chatImageModels = await this.GetAll();
      const filteredModels = chatImageModels.models.filter(
        (m) => m.id !== modelId,
      );

      await this.saveDebounced({
        selectedModelId:
          chatImageModels.selectedModelId === modelId
            ? ""
            : chatImageModels.selectedModelId,
        models: filteredModels,
      });

      return true;
    } catch (error) {
      d.ErrorService().log("Failed to delete chat image model", error);
      return false;
    }
  }

  public async SelectModel(modelId: string): Promise<ImageModel | null> {
    const chatImageModels = await this.GetAll();
    const selectedModel = chatImageModels.models.find((m) => m.id === modelId);

    if (!selectedModel) {
      d.ErrorService().log(
        `Chat image model with ID ${modelId} not found`,
        new Error("Model not found"),
      );
      return null;
    }
    if (!isWorkflowImageModel(selectedModel)) {
      d.ErrorService().log(
        "Cannot select legacy chat image model before workflow migration",
        new Error("Legacy image model requires migration"),
      );
      return null;
    }

    await this.saveDebounced({ ...chatImageModels, selectedModelId: modelId });
    return selectedModel;
  }

  /**
   * Gets the selected model for this chat, or falls back to the global default model.
   */
  public async getSelectedModelOrDefault(): Promise<ImageModel> {
    const chatImageModels = await this.GetAll();

    // Try to find selected model in chat-specific models
    if (chatImageModels.selectedModelId) {
      const selectedModel = chatImageModels.models.find(
        (m) => m.id === chatImageModels.selectedModelId,
      );
      if (selectedModel) {
        if (isWorkflowImageModel(selectedModel)) return selectedModel;
      }
    }

    // Fall back to global default
    return d.ImageModelService().getOrDefaultSelectedModel();
  }

  /**
   * Creates a copy of a default image model for use in this chat.
   */
  public async AddFromTemplate(
    templateModelId: string,
  ): Promise<ImageModel | null> {
    try {
      const globalModels = await d.ImageModelService().GetAllImageModels();
      const template = globalModels.models.find(
        (m) => m.id === templateModelId,
      );

      if (!template || !isWorkflowImageModel(template)) {
        d.ErrorService().log(
          `Template model with ID ${templateModelId} not found or requires migration`,
          new Error("Template not available"),
        );
        return null;
      }

      // Create an independent copy with a new ID and timestamp
      const copy: ImageModel = {
        ...JSON.parse(JSON.stringify(template)),
        id: crypto.randomUUID(),
        timestampUtcMs: Date.now(),
        name: `${template.name} (Copy)`,
      };

      await this.SaveModel(copy);
      return copy;
    } catch (error) {
      d.ErrorService().log("Failed to add model from template", error);
      return null;
    }
  }

  // ---- Subscriptions ----

  subscribe = (callback: () => void) => this.blob().subscribe(callback);
  isLoading = () => this.blob().isLoading();

  public async MigrateModelToWorkflow(
    modelId: string,
  ): Promise<ImageModel | null> {
    try {
      const chatImageModels = await this.GetAll();
      const model = chatImageModels.models.find((m) => m.id === modelId);
      if (!model) return null;

      const converted = imageModelWorkflowConverter.convert(model);
      await this.saveDebounced({
        ...chatImageModels,
        models: this.updateAnyModel(chatImageModels.models, converted),
      });
      return converted;
    } catch (error) {
      d.ErrorService().log("Failed to migrate chat image model", error);
      return null;
    }
  }

  // ---- Private Helpers ----

  private createEmpty = (): ChatImageModels => ({
    selectedModelId: "",
    models: [],
  });

  private modelExists = (models: AnyImageModel[], modelId: string): boolean =>
    models.some((m) => m.id === modelId);

  private updateModel = (
    models: AnyImageModel[],
    updatedModel: ImageModel,
  ): AnyImageModel[] =>
    models.map((m) => (m.id === updatedModel.id ? updatedModel : m));

  private updateAnyModel = (
    models: AnyImageModel[],
    updatedModel: AnyImageModel,
  ): AnyImageModel[] =>
    models.map((m) => (m.id === updatedModel.id ? updatedModel : m));

  private saveDebounced = async (data: ChatImageModels): Promise<void> =>
    await this.blob().saveDebounced(data);
}
