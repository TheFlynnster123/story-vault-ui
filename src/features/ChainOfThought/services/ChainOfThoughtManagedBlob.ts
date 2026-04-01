import { ManagedBlob } from "../../../services/Blob/ManagedBlob";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import type { ChainOfThought } from "./ChainOfThought";

export const getChainOfThoughtManagedBlobInstance = createInstanceCache(
  (chatId: string) =>
    new ManagedBlob<ChainOfThought[]>(`chain-of-thought-${chatId}`, []),
);
