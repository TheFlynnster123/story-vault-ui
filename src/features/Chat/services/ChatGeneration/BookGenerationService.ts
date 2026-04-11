import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";

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

      const model = await this.resolveBookSummaryModel();

      this.setStatus("Generating book summary...");
      return await d.OpenRouterChatAPI().postChat(requestMessages, model);
    });
  }

  async generateBookTitle(
    chapterSummaries: string[],
  ): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildBookTitleRequestMessages(chapterSummaries);

      const model = await this.resolveBookTitleModel();

      this.setStatus("Generating book title...");
      return await d.OpenRouterChatAPI().postChat(requestMessages, model);
    });
  }

  private async resolveBookSummaryModel(): Promise<string | undefined> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return systemPrompts?.bookSummaryModel || undefined;
  }

  private async resolveBookTitleModel(): Promise<string | undefined> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return systemPrompts?.bookTitleModel || undefined;
  }
}
