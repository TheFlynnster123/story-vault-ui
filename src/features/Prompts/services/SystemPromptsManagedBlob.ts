import { ManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { SystemPrompts } from "./SystemPrompts";

const SYSTEM_PROMPTS_BLOB_NAME = "system-prompts";
const GLOBAL_CHAT_ID = "global";

// Singleton instance (global blob)
let instance: SystemPromptsManagedBlob | null = null;

export const getSystemPromptsManagedBlobInstance =
  (): SystemPromptsManagedBlob => {
    if (!instance) {
      instance = new SystemPromptsManagedBlob();
    }
    return instance;
  };

export class SystemPromptsManagedBlob extends ManagedBlob<SystemPrompts> {
  constructor() {
    super(GLOBAL_CHAT_ID);
  }

  protected getBlobName(): string {
    return SYSTEM_PROMPTS_BLOB_NAME;
  }
}
