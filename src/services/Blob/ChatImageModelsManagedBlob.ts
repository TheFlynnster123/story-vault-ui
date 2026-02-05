import { ManagedBlob } from "./ManagedBlob";
import type { ImageModel } from "../Image/modelGeneration/ImageModel";

const CHAT_IMAGE_MODELS_BLOB_NAME = "chat-image-models";

export type ChatImageModels = {
  selectedModelId: string;
  models: ImageModel[];
};

// Singleton instances per chatId
const instances = new Map<string, ChatImageModelsManagedBlob>();

export const getChatImageModelsManagedBlobInstance = (
  chatId: string,
): ChatImageModelsManagedBlob => {
  if (!instances.has(chatId)) {
    instances.set(chatId, new ChatImageModelsManagedBlob(chatId));
  }
  return instances.get(chatId)!;
};

export class ChatImageModelsManagedBlob extends ManagedBlob<ChatImageModels> {
  constructor(chatId: string) {
    super(chatId);
  }

  protected getBlobName(): string {
    return CHAT_IMAGE_MODELS_BLOB_NAME;
  }
}
