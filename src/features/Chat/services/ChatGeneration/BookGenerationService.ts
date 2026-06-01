import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { OpenRouterRequestSettings } from "../../../OpenRouter/services/OpenRouterRequestSettings";

export const getBookGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new BookGenerationService(chatId),
);

export class BookGenerationService extends GenerationOrchestrator {
  private chatId: string;

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
  }

  async generateBookSummary(
    chapterSummaries: string[],
  ): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildBookSummaryRequestMessages(chapterSummaries);

      const { model, requestSettings } = await this.resolveBookSummaryModel();

      this.setStatus("Generating book summary...");
      return await d
        .OpenRouterChatAPI()
        .postChat(requestMessages, model, "chat", "LLM", requestSettings);
    });
  }

  async generateBookTitle(
    chapterSummaries: string[],
  ): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildBookTitleRequestMessages(chapterSummaries);

      const { model, requestSettings } = await this.resolveBookTitleModel();

      this.setStatus("Generating book title...");
      return await d
        .OpenRouterChatAPI()
        .postChat(requestMessages, model, "chat", "LLM", requestSettings);
    });
  }

  private async resolveBookSummaryModel(): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return {
      model: systemPrompts?.bookSummaryModel || undefined,
      requestSettings: systemPrompts?.bookSummaryRequestSettings,
    };
  }

  private async resolveBookTitleModel(): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return {
      model: systemPrompts?.bookTitleModel || undefined,
      requestSettings: systemPrompts?.bookTitleRequestSettings,
    };
  }
}
