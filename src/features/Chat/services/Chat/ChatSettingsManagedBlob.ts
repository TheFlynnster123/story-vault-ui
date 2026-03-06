import { createManagedBlob } from "../../../../services/Blob/ManagedBlob";
import type { ChatSettings } from "./ChatSettings";

export const getChatSettingsManagedBlobInstance =
  createManagedBlob<ChatSettings>("chat-settings");
