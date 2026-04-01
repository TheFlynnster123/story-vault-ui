import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ChainOfThought } from "./ChainOfThought";

export const getChainOfThoughtManagedBlobInstance =
  createManagedBlob<ChainOfThought[]>("chain-of-thought");

