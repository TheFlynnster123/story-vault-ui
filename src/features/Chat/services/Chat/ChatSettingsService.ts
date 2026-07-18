import { d } from "../../../../services/Dependencies";
import type { ChatSettings } from "./ChatSettings";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { OpenRouterRequestSettings } from "../../../OpenRouter/services/OpenRouterRequestSettings";

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
  getCached = () => this.blob().getCached();
  save = (data: ChatSettings) => this.blob().save(data);
  saveDebounced = (data: ChatSettings) => this.blob().saveDebounced(data);
  savePendingChanges = () => this.blob().savePendingChanges();

  refetch = () => this.blob().refetch();
  delete = () => this.blob().delete();
  subscribe = (callback: () => void) => this.blob().subscribe(callback);
  isLoading = () => this.blob().isLoading();

  /**
   * Updates specific chat settings fields without replacing unrelated settings.
   * Prefer this for feature-owned updates so newer settings are preserved.
   */
  async update(updates: Partial<ChatSettings>): Promise<void> {
    const currentSettings = await this.Get();
    if (!currentSettings) return;

    await this.save({
      ...currentSettings,
      ...updates,
    });
  }

  /**
   * Debounced variant of update() for form controls and sliders.
   */
  async updateDebounced(updates: Partial<ChatSettings>): Promise<void> {
    const currentSettings = await this.Get();
    if (!currentSettings) return;

    this.saveDebounced({
      ...currentSettings,
      ...updates,
    });
  }

  /**
   * Sets the background photo from a base64 string and clears any CivitJob background.
   */
  async setBackgroundPhotoBase64(base64: string | undefined): Promise<void> {
    await this.updateDebounced({
      backgroundPhotoBase64: base64,
      backgroundPhotoWorkflowId: undefined,
      backgroundPhotoCivitJobId: undefined,
    });
  }

  /**
   * Sets the background photo from a workflow ID and clears any uploaded background.
   */
  async setBackgroundPhotoWorkflowId(
    workflowId: string | undefined,
  ): Promise<void> {
    await this.updateDebounced({
      backgroundPhotoBase64: undefined,
      backgroundPhotoWorkflowId: workflowId,
      backgroundPhotoCivitJobId: undefined,
    });
  }

  async setBackgroundPhotoCivitJobId(jobId: string | undefined): Promise<void> {
    await this.setBackgroundPhotoWorkflowId(jobId);
  }

  /**
   * Sets a per-chat model override, overriding the system default model for this chat.
   */
  async setModelOverride(
    modelId: string | undefined,
    requestSettings?: OpenRouterRequestSettings,
  ): Promise<void> {
    await this.update({
      modelOverride: modelId,
      modelRequestSettingsOverride: modelId ? requestSettings : undefined,
      modelReasoningEffortOverride: undefined,
    });
  }

  /**
   * Sets the per-chat message transparency (0-1).
   */
  async setMessageTransparency(value: number): Promise<void> {
    await this.updateDebounced({
      messageTransparency: value,
    });
  }

  async setReasoningEnabled(enabled: boolean): Promise<void> {
    await this.update({
      reasoningEnabled: enabled,
    });
  }

  async setReasoningModelOverride(
    modelId: string | undefined,
    requestSettings?: OpenRouterRequestSettings,
  ): Promise<void> {
    await this.update({
      reasoningModelOverride: modelId,
      reasoningModelRequestSettingsOverride: modelId ? requestSettings : undefined,
    });
  }

  async setReasoningConsolidateMessageHistory(value: boolean): Promise<void> {
    await this.update({
      reasoningConsolidateMessageHistory: value,
    });
  }

  async setReasoningPromptOverride(prompt: string | undefined): Promise<void> {
    await this.updateDebounced({
      reasoningPromptOverride: prompt,
    });
  }

  async setReasoningExpiresAfterMessages(
    expiresAfterMessages: number | null,
  ): Promise<void> {
    await this.update({
      reasoningExpiresAfterMessages: expiresAfterMessages,
    });
  }
}
