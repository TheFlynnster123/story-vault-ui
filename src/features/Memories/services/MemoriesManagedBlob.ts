import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { Memory } from "./Memory";

export const getMemoriesManagedBlobInstance =
  createManagedBlob<Memory[]>("memories");
