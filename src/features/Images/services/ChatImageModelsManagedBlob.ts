import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ImageModel } from "./modelGeneration/ImageModel";

export type ChatImageModels = {
  selectedModelId: string;
  models: ImageModel[];
};

export const getChatImageModelsManagedBlobInstance =
  createManagedBlob<ChatImageModels>("chat-image-models");
