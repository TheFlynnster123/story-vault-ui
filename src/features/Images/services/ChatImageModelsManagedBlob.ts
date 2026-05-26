import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { AnyImageModel } from "./modelGeneration/ImageModel";

export type ChatImageModels = {
  selectedModelId: string;
  models: AnyImageModel[];
};

export const getChatImageModelsManagedBlobInstance =
  createManagedBlob<ChatImageModels>("chat-image-models");
