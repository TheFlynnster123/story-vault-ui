import { ManagedBlob } from "./ManagedBlob";
import type { SystemSettings } from "../System/SystemSettings";

const SYSTEM_SETTINGS_BLOB_NAME = "system-settings";
const GLOBAL_CHAT_ID = "global";

// Singleton instance (global blob)
let instance: SystemSettingsManagedBlob | null = null;

export const getSystemSettingsManagedBlobInstance =
  (): SystemSettingsManagedBlob => {
    if (!instance) {
      instance = new SystemSettingsManagedBlob();
    }
    return instance;
  };

export class SystemSettingsManagedBlob extends ManagedBlob<SystemSettings> {
  constructor() {
    super(GLOBAL_CHAT_ID);
  }

  protected getBlobName(): string {
    return SYSTEM_SETTINGS_BLOB_NAME;
  }
}
