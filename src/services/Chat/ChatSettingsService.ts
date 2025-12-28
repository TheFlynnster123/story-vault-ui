import { ManagedBlob } from "../Blob/ManagedBlob";
import type { ChatSettings } from "./ChatSettings";

const CHAT_SETTINGS_BLOB_NAME = "chat-settings";

// Singleton instances per chatId
const instances = new Map<string, ChatSettingsService>();

export const getChatSettingsServiceInstance = (
  chatId: string
): ChatSettingsService => {
  if (!instances.has(chatId)) {
    instances.set(chatId, new ChatSettingsService(chatId));
  }
  return instances.get(chatId)!;
};

export class ChatSettingsService extends ManagedBlob<ChatSettings> {
  constructor(chatId: string) {
    super(chatId);
  }

  protected getBlobName(): string {
    return CHAT_SETTINGS_BLOB_NAME;
  }

  /**
   * Sets the background photo from a base64 string and clears any CivitJob background.
   */
  async setBackgroundPhotoBase64(base64: string | undefined): Promise<void> {
    const currentSettings = await this.get();
    if (!currentSettings) return;

    await this.save({
      ...currentSettings,
      backgroundPhotoBase64: base64,
      backgroundPhotoCivitJobId: undefined,
    });
  }

  /**
   * Sets the background photo from a CivitJob ID and clears any uploaded background.
   */
  async setBackgroundPhotoCivitJobId(jobId: string | undefined): Promise<void> {
    const currentSettings = await this.get();
    if (!currentSettings) return;

    await this.save({
      ...currentSettings,
      backgroundPhotoBase64: undefined,
      backgroundPhotoCivitJobId: jobId,
    });
  }
}
