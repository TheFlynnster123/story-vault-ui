import { d } from "../../../services/Dependencies";
import type { AnyImageModel, ImageModel } from "./modelGeneration/ImageModel";
import { isWorkflowImageModel } from "./modelGeneration/ImageModel";
import type { ChatImageVariants } from "./ChatImageVariantsManagedBlob";
import type { ImageModelVariant } from "./ImageModelVariant";
import { resolveVariant } from "./ImageModelVariant";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import { LegacyChatImageModelsMigration } from "./LegacyChatImageModelsMigration";

export const getChatImageVariantServiceInstance = createInstanceCache(
  (chatId: string) => new ChatImageVariantService(chatId),
);

export class ChatImageVariantService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  private blob = () => d.ChatImageVariantsManagedBlob(this.chatId);

  public SavePendingChanges = async () =>
    await this.blob().savePendingChanges();

  public async GetAll(): Promise<ChatImageVariants> {
    const data = await this.blob().get();
    if (data) return data;

    try {
      const migrated = await new LegacyChatImageModelsMigration(
        this.chatId,
      ).migrate();
      await this.blob().save(migrated);
      if (migrated.legacyMigration?.status === "migrated") {
        try {
          await d.ChatImageModelsManagedBlob(this.chatId).delete();
        } catch (error) {
          d.ErrorService().log(
            "Older chat image settings were migrated but could not be cleaned up",
            error,
          );
        }
      }
      return migrated;
    } catch (error) {
      d.ErrorService().log("Failed to migrate older chat image settings", error);
      const fallback: ChatImageVariants = {
        ...this.createEmpty(),
        legacyMigration: {
          status: "partial",
          message:
            "Older chat image settings could not be loaded. Image generation will use the system default; you can choose a new model here.",
        },
      };
      await this.blob().save(fallback);
      return fallback;
    }
  }

  public async SaveVariant(variant: ImageModelVariant): Promise<boolean> {
    try {
      if (!variant.id) {
        d.ErrorService().log(
          "Cannot save variant without a valid ID",
          new Error("Invalid variant ID"),
        );
        return false;
      }

      const data = await this.GetAll();

      if (this.variantExists(data.variants, variant.id)) {
        const updated = data.variants.map((v) =>
          v.id === variant.id ? variant : v,
        );
        this.blob().saveDebounced({ ...data, variants: updated });
      } else {
        this.blob().saveDebounced({
          ...data,
          variants: [...data.variants, variant],
        });
      }

      return true;
    } catch (error) {
      d.ErrorService().log("Failed to save image model variant", error);
      return false;
    }
  }

  public async DeleteVariant(variantId: string): Promise<boolean> {
    try {
      const data = await this.GetAll();
      const filtered = data.variants.filter((v) => v.id !== variantId);
      this.blob().saveDebounced({
        selectedVariantId:
          data.selectedVariantId === variantId ? "" : data.selectedVariantId,
        selectedSystemModelId: data.selectedSystemModelId,
        variants: filtered,
      });
      return true;
    } catch (error) {
      d.ErrorService().log("Failed to delete image model variant", error);
      return false;
    }
  }

  public async SelectVariant(variantId: string): Promise<boolean> {
    try {
      const data = await this.GetAll();
      const variant = data.variants.find((v) => v.id === variantId);
      if (!variant) {
        return false;
      }
      const parent = await this.findParentModel(variant.parentModelId);
      if (!isWorkflowImageModel(parent)) {
        d.ErrorService().log(
          "Cannot select image model variant because its system model is unavailable",
          new Error(`Missing workflow parent ${variant.parentModelId}`),
        );
        return false;
      }
      this.blob().saveDebounced({
        ...data,
        selectedVariantId: variantId,
        selectedSystemModelId: "",
      });
      return true;
    } catch (error) {
      d.ErrorService().log("Failed to select image model variant", error);
      return false;
    }
  }

  public async SelectSystemModel(modelId: string): Promise<boolean> {
    try {
      const globalModels = await d.ImageModelService().GetAllImageModels();
      const model = globalModels.models.find((m) => m.id === modelId);
      if (!isWorkflowImageModel(model)) {
        d.ErrorService().log(
          "Cannot select unavailable or incompatible system image model",
          new Error(`Invalid system image model ${modelId}`),
        );
        return false;
      }
      const data = await this.GetAll();
      this.blob().saveDebounced({
        ...data,
        selectedVariantId: "",
        selectedSystemModelId: modelId,
      });
      return true;
    } catch (error) {
      d.ErrorService().log("Failed to select system image model", error);
      return false;
    }
  }

  public async CreateVariant(
    parentModelId: string,
    name: string,
  ): Promise<ImageModelVariant | null> {
    try {
      const parent = await this.findParentModel(parentModelId);
      if (!isWorkflowImageModel(parent)) {
        d.ErrorService().log(
          "Cannot create variant because its system image model is unavailable",
          new Error(`Missing workflow parent ${parentModelId}`),
        );
        return null;
      }
      const variant: ImageModelVariant = {
        id: crypto.randomUUID(),
        name,
        parentModelId,
        timestampUtcMs: Date.now(),
        overrides: {},
      };
      const saved = await this.SaveVariant(variant);
      return saved ? variant : null;
    } catch (error) {
      d.ErrorService().log("Failed to create image model variant", error);
      return null;
    }
  }

  public async getSelectedModelOrDefault(): Promise<ImageModel> {
    const data = await this.GetAll();

    if (data.selectedVariantId) {
      const selected = data.variants.find(
        (v) => v.id === data.selectedVariantId,
      );
      if (selected) {
        const parent = await this.findParentModel(selected.parentModelId);
        if (parent && isWorkflowImageModel(parent)) {
          return resolveVariant(selected, parent);
        }
      }
    }

    if (data.selectedSystemModelId) {
      const globalModels = await d.ImageModelService().GetAllImageModels();
      const systemModel = globalModels.models.find(
        (m) => m.id === data.selectedSystemModelId,
      );
      if (isWorkflowImageModel(systemModel)) {
        return systemModel;
      }
    }

    return d.ImageModelService().getOrDefaultSelectedModel();
  }

  public async findParentModel(
    parentModelId: string,
  ): Promise<AnyImageModel | null> {
    const globalModels = await d.ImageModelService().GetAllImageModels();
    return globalModels.models.find((m) => m.id === parentModelId) ?? null;
  }

  subscribe = (callback: () => void) => this.blob().subscribe(callback);
  isLoading = () => this.blob().isLoading();

  private createEmpty = (): ChatImageVariants => ({
    selectedVariantId: "",
    selectedSystemModelId: "",
    variants: [],
  });

  private variantExists = (variants: ImageModelVariant[], id: string) =>
    variants.some((v) => v.id === id);
}
