import { createGlobalManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ImageModel } from "./modelGeneration/ImageModel";

export type UserImageModels = {
  selectedModelId: string;
  models: ImageModel[];
};

export const getImageModelsManagedBlobInstance =
  createGlobalManagedBlob<UserImageModels>("UserImageModels");
