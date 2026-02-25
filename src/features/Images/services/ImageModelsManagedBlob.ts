import { ManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ImageModel } from "./modelGeneration/ImageModel";

const USER_IMAGE_MODELS_BLOB_NAME = "UserImageModels";
const GLOBAL_CHAT_ID = "global";

export type UserImageModels = {
  selectedModelId: string;
  models: ImageModel[];
};

// Singleton instance (global blob)
let instance: ImageModelsManagedBlob | null = null;

export const getImageModelsManagedBlobInstance = (): ImageModelsManagedBlob => {
  if (!instance) {
    instance = new ImageModelsManagedBlob();
  }
  return instance;
};

export class ImageModelsManagedBlob extends ManagedBlob<UserImageModels> {
  constructor() {
    super(GLOBAL_CHAT_ID);
  }

  protected getBlobName(): string {
    return USER_IMAGE_MODELS_BLOB_NAME;
  }
}
