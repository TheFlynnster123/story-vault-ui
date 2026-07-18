import { createGlobalManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ModelPresets } from "./ModelPresetsService";

export const getModelPresetsManagedBlobInstance =
  createGlobalManagedBlob<ModelPresets>("model-presets");
