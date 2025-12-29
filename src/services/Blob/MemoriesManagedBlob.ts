import { ManagedBlob } from "./ManagedBlob";
import type { Memory } from "../ChatGeneration/Memory";

const MEMORIES_BLOB_NAME = "memories";

// Singleton instances per chatId
const instances = new Map<string, MemoriesManagedBlob>();

export const getMemoriesManagedBlobInstance = (
  chatId: string
): MemoriesManagedBlob => {
  if (!instances.has(chatId)) {
    instances.set(chatId, new MemoriesManagedBlob(chatId));
  }
  return instances.get(chatId)!;
};

export class MemoriesManagedBlob extends ManagedBlob<Memory[]> {
  constructor(chatId: string) {
    super(chatId);
  }

  protected getBlobName(): string {
    return MEMORIES_BLOB_NAME;
  }
}
