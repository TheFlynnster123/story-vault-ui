import { createGlobalManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { SystemPrompts } from "./SystemPrompts";

export const getSystemPromptsManagedBlobInstance =
  createGlobalManagedBlob<SystemPrompts>("system-prompts");
