import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { OpenRouterRequestSettings } from "../../../OpenRouter/services/OpenRouterRequestSettings";

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

      const { model, requestSettings } =
        await this.resolveChapterSummaryModel();

      this.setStatus("Generating chapter summary...");
      return await d
        .OpenRouterChatAPI()
        .postChat(requestMessages, model, "chat", "LLM", requestSettings);
    });
  }

  async generateChapterTitle(): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildChapterTitleRequestMessages();

      const { model, requestSettings } = await this.resolveChapterTitleModel();

      this.setStatus("Generating chapter title...");
      return await d
        .OpenRouterChatAPI()
        .postChat(requestMessages, model, "chat", "LLM", requestSettings);
    });
  }

  private async resolveChapterSummaryModel(): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return {
      model: systemPrompts?.chapterSummaryModel || undefined,
      requestSettings: systemPrompts?.chapterSummaryRequestSettings,
    };
  }

  private async resolveChapterTitleModel(): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return {
      model: systemPrompts?.chapterTitleModel || undefined,
      requestSettings: systemPrompts?.chapterTitleRequestSettings,
    };
  }
}
