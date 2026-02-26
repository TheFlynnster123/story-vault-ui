import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";

const instances = new Map<string, ChapterGenerationService>();

export const getChapterGenerationServiceInstance = (
  chatId: string | null,
): ChapterGenerationService | null => {
  if (!chatId) return null;

  if (!instances.has(chatId))
    instances.set(chatId, new ChapterGenerationService(chatId));

  return instances.get(chatId)!;
};

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
      return await d.GrokChatAPI().postChat(requestMessages);
    });
  }

  async generateChapterTitle(): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildChapterTitleRequestMessages();

      this.setStatus("Generating chapter title...");
      return await d.GrokChatAPI().postChat(requestMessages);
    });
  }
}
