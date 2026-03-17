import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";

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

      const model = await this.resolveChapterSummaryModel();

      this.setStatus("Generating chapter summary...");
      return await d.OpenRouterChatAPI().postChat(requestMessages, model);
    });
  }

  async generateChapterTitle(): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildChapterTitleRequestMessages();

      const model = await this.resolveChapterTitleModel();

      this.setStatus("Generating chapter title...");
      return await d.OpenRouterChatAPI().postChat(requestMessages, model);
    });
  }

  private async resolveChapterSummaryModel(): Promise<string | undefined> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return systemPrompts?.chapterSummaryModel || DEFAULT_SYSTEM_PROMPTS.chapterSummaryModel || undefined;
  }

  private async resolveChapterTitleModel(): Promise<string | undefined> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return systemPrompts?.chapterTitleModel || DEFAULT_SYSTEM_PROMPTS.chapterTitleModel || undefined;
  }
}
