import { createGlobalManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { PlanPresets } from "./PlanPreset";

export const getPlanPresetsManagedBlobInstance =
  createGlobalManagedBlob<PlanPresets>("plan-presets");
