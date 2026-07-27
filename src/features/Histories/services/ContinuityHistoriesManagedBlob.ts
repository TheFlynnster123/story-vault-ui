import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ContinuityHistoryStore } from "./ContinuityHistory";

export const getContinuityHistoriesManagedBlobInstance =
  createManagedBlob<ContinuityHistoryStore>("continuity-histories");
