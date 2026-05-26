import { createGlobalManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { AnyImageModel } from "./modelGeneration/ImageModel";

export type UserImageModels = {
  selectedModelId: string;
  models: AnyImageModel[];
};

export const getImageModelsManagedBlobInstance =
  createGlobalManagedBlob<UserImageModels>("UserImageModels");
