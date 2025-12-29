import { ManagedBlob } from "./ManagedBlob";
import type { Plan } from "../ChatGeneration/Plan";

const PLAN_BLOB_NAME = "plan";

// Singleton instances per chatId
const instances = new Map<string, PlansManagedBlob>();

export const getPlansManagedBlobInstance = (
  chatId: string
): PlansManagedBlob => {
  if (!instances.has(chatId))
    instances.set(chatId, new PlansManagedBlob(chatId));

  return instances.get(chatId)!;
};

export class PlansManagedBlob extends ManagedBlob<Plan[]> {
  constructor(chatId: string) {
    super(chatId);
  }

  protected getBlobName(): string {
    return PLAN_BLOB_NAME;
  }
}
