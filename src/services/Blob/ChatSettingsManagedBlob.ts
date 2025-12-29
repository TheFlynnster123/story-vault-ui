import { ManagedBlob } from "./ManagedBlob";
import type { ChatSettings } from "../Chat/ChatSettings";

const CHAT_SETTINGS_BLOB_NAME = "chat-settings";

// Singleton instances per chatId
const instances = new Map<string, ChatSettingsManagedBlob>();

export const getChatSettingsManagedBlobInstance = (
  chatId: string
): ChatSettingsManagedBlob => {
  if (!instances.has(chatId)) {
    instances.set(chatId, new ChatSettingsManagedBlob(chatId));
  }
  return instances.get(chatId)!;
};

export class ChatSettingsManagedBlob extends ManagedBlob<ChatSettings> {
  constructor(chatId: string) {
    super(chatId);
  }

  protected getBlobName(): string {
    return CHAT_SETTINGS_BLOB_NAME;
  }
}
