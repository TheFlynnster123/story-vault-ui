import { createGlobalManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { SystemSettings } from "./SystemSettings";

export const getSystemSettingsManagedBlobInstance =
  createGlobalManagedBlob<SystemSettings>("system-settings");
