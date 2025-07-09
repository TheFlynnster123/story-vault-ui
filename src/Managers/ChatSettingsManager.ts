import type { BlobAPI } from "../clients/BlobAPI";
import type { ChatSettings } from "../models/ChatSettings";

const NOTE_NAME = "chat-settings";

export class ChatSettingsManager {
  private blobAPI: BlobAPI;

  constructor(blobAPI: BlobAPI) {
    this.blobAPI = blobAPI;
  }

  async get(chatId: string): Promise<ChatSettings | null> {
    const content = await this.blobAPI.getBlob(chatId, NOTE_NAME);
    if (!content) {
      return null;
    }

    try {
      return JSON.parse(content) as ChatSettings;
    } catch (error) {
      console.error(`Failed to parse chat settings for ${chatId}:`, error);
      return null;
    }
  }

  async create(chatId: string, settings: ChatSettings): Promise<void> {
    const content = JSON.stringify(settings);
    await this.blobAPI.saveBlob(chatId, NOTE_NAME, content);
  }

  async update(chatId: string, settings: ChatSettings): Promise<void> {
    const content = JSON.stringify(settings);
    await this.blobAPI.saveBlob(chatId, NOTE_NAME, content);
  }
}
