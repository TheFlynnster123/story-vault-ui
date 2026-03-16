import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";

export const getChapterGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new ChapterGenerationService(chatId),
);

export class ChapterGenerationService extends GenerationOrchestrator {
  private chatId: string;

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
  }

  async generateChapterSummary(): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildChapterSummaryRequestMessages();

      this.setStatus("Generating chapter summary...");
      return await d.OpenRouterChatAPI().postChat(requestMessages);
    });
  }

  async generateChapterTitle(): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildChapterTitleRequestMessages();

      this.setStatus("Generating chapter title...");
      return await d.OpenRouterChatAPI().postChat(requestMessages);
    });
  }
}
