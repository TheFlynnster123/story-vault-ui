import { d } from "../../../../services/Dependencies";
import type { ChatSettings } from "./ChatSettings";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";

export const getChatSettingsServiceInstance = createInstanceCache(
  (chatId: string) => new ChatSettingsService(chatId),
);

export class ChatSettingsService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  private blob = () => d.ChatSettingsManagedBlob(this.chatId);

  Get = () => this.blob().get();
  save = (data: ChatSettings) => this.blob().save(data);
  saveDebounced = (data: ChatSettings) => this.blob().saveDebounced(data);
  savePendingChanges = () => this.blob().savePendingChanges();

  refetch = () => this.blob().refetch();
  delete = () => this.blob().delete();
  subscribe = (callback: () => void) => this.blob().subscribe(callback);
  isLoading = () => this.blob().isLoading();

  /**
   * Sets the background photo from a base64 string and clears any CivitJob background.
   */
  async setBackgroundPhotoBase64(base64: string | undefined): Promise<void> {
    const currentSettings = await this.Get();
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
    const currentSettings = await this.Get();
    if (!currentSettings) return;

    await this.saveDebounced({
      ...currentSettings,
      backgroundPhotoBase64: undefined,
      backgroundPhotoCivitJobId: jobId,
    });
  }
}
