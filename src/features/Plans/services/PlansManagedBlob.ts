import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { Plan } from "./Plan";

export const getPlansManagedBlobInstance = createManagedBlob<Plan[]>("plan");
