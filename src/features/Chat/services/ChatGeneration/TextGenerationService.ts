import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";

export const getTextGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new TextGenerationService(chatId),
);

export class TextGenerationService extends GenerationOrchestrator {
  private chatId: string;

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
  }

  private async getChatModelOverride(): Promise<string | undefined> {
    const chatSettings = await d.ChatSettingsService(this.chatId).Get();
    return chatSettings?.modelOverride;
  }

  async generateResponse(guidance?: string): Promise<string | undefined> {
    return this.orchestrate(async () => {
      d.PlanGenerationService(this.chatId).onMessageSent();

      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildGenerationRequestMessages(true, guidance);

      this.setStatus("Generating response...");

      const modelOverride = await this.getChatModelOverride();
      const streamingId = crypto.randomUUID();
      const projection = d.UserChatProjection(this.chatId);
      projection.addStreamingMessage(streamingId);

      try {
        const response = await d.OpenRouterChatAPI().postChatStream(
          requestMessages,
          (content) => {
            projection.updateStreamingMessage(content);
          },
          modelOverride,
        );

        this.setStatus("Saving...");
        await d.ChatService(this.chatId).AddAssistantMessage(response);
        projection.removeStreamingMessage();

        return response;
      } catch (error) {
        projection.removeStreamingMessage();
        throw error;
      }
    });
  }

  async regenerateResponse(
    messageId: string,
    feedback?: string,
  ): Promise<string | undefined> {
    const message = d.LLMChatProjection(this.chatId).GetMessage(messageId);

    if (!message) {
      console.warn(`Message with id ${messageId} not found`);
      return;
    }

    return this.orchestrate(async () => {
      const originalContent = message.content;

      d.PlanGenerationService(this.chatId).onMessageSent();

      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildRegenerationRequestMessages(messageId, originalContent, feedback);

      this.setStatus("Generating response...");

      const modelOverride = await this.getChatModelOverride();
      const projection = d.UserChatProjection(this.chatId);
      projection.startStreamingExistingMessage(messageId);

      try {
        const response = await d.OpenRouterChatAPI().postChatStream(
          requestMessages,
          (content) => {
            projection.updateStreamingMessage(content);
          },
          modelOverride,
        );

        this.setStatus("Saving....");
        await d.ChatService(this.chatId).EditMessage(messageId, response);
        projection.removeStreamingMessage();

        return response;
      } catch (error) {
        projection.removeStreamingMessage();
        throw error;
      }
    });
  }
}
