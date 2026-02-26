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

  async generateResponse(): Promise<string | undefined> {
    return this.orchestrate(async () => {
      this.setStatus("Updating plans...");
      const chatMessages = d.LLMChatProjection(this.chatId).GetMessages();
      await d
        .PlanGenerationService(this.chatId)
        .generateUpdatedPlans(chatMessages);

      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildGenerationRequestMessages();

      this.setStatus("Generating response...");
      const response = await d.GrokChatAPI().postChat(requestMessages);

      this.setStatus("Saving...");
      await d.ChatService(this.chatId).AddAssistantMessage(response);

      return response;
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

      await d.ChatService(this.chatId).DeleteMessage(messageId);

      this.setStatus("Updating plans...");
      const chatMessages = d.LLMChatProjection(this.chatId).GetMessages();
      await d
        .PlanGenerationService(this.chatId)
        .generateUpdatedPlans(chatMessages);

      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildRegenerationRequestMessages(originalContent, feedback);

      this.setStatus("Generating response...");
      const response = await d.GrokChatAPI().postChat(requestMessages);

      this.setStatus("Saving....");
      await d.ChatService(this.chatId).AddAssistantMessage(response);

      return response;
    });
  }
}
