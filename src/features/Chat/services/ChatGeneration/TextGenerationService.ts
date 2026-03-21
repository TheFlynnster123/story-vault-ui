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

  async generateResponse(guidance?: string): Promise<string | undefined> {
    return this.orchestrate(async () => {
      d.PlanGenerationService(this.chatId).onMessageSent();

      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildGenerationRequestMessages(true, guidance);

      this.setStatus("Generating response...");

      const streamingId = crypto.randomUUID();
      const projection = d.UserChatProjection(this.chatId);
      projection.addStreamingMessage(streamingId);

      try {
        const response = await d
          .OpenRouterChatAPI()
          .postChatStream(requestMessages, (content) => {
            projection.updateStreamingMessage(content);
          });

        projection.removeStreamingMessage();

        this.setStatus("Saving...");
        await d.ChatService(this.chatId).AddAssistantMessage(response);

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

      const projection = d.UserChatProjection(this.chatId);
      projection.startStreamingExistingMessage(messageId);

      try {
        const response = await d
          .OpenRouterChatAPI()
          .postChatStream(requestMessages, (content) => {
            projection.updateStreamingMessage(content);
          });

        projection.removeStreamingMessage();

        this.setStatus("Saving....");
        await d.ChatService(this.chatId).EditMessage(messageId, response);

        return response;
      } catch (error) {
        projection.removeStreamingMessage();
        throw error;
      }
    });
  }
}
