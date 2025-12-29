import { d } from "../Dependencies";
import type { ChatSettings } from "./ChatSettings";

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

export class ChatSettingsService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  private blob = () => d.ChatSettingsManagedBlob(this.chatId);

  get = () => this.blob().get();
  save = (data: ChatSettings) => this.blob().save(data);
  saveDebounced = (data: ChatSettings) => this.blob().saveDebounced(data);
  refetch = () => this.blob().refetch();
  delete = () => this.blob().delete();
  subscribe = (callback: () => void) => this.blob().subscribe(callback);
  isLoading = () => this.blob().isLoading();

  /**
   * Sets the background photo from a base64 string and clears any CivitJob background.
   */
  async setBackgroundPhotoBase64(base64: string | undefined): Promise<void> {
    const currentSettings = await this.get();
    if (!currentSettings) return;

    await this.saveDebounced({
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

    await this.saveDebounced({
      ...currentSettings,
      backgroundPhotoBase64: undefined,
      backgroundPhotoCivitJobId: jobId,
    });
  }
}
