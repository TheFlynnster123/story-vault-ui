import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { OpenRouterRequestSettings } from "../../../OpenRouter/services/OpenRouterRequestSettings";
import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";

export interface ChapterDraft {
  title: string;
  summary: string;
}

export const getChapterGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new ChapterGenerationService(chatId),
);

export class ChapterGenerationService extends GenerationOrchestrator {
  private chatId: string;

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
  }

  async generateChapterDraft(
    snapshot: LLMMessage[],
  ): Promise<ChapterDraft | undefined> {
    return this.orchestrate(async () => {
      this.setStatus("Generating chapter draft...");
      const context = d.LLMMessageContextService(this.chatId);
      const [messages, config] = await Promise.all([
        context.buildChapterDraftRequestMessages(snapshot),
        this.resolveChapterModel(),
      ]);
      const response = await d
        .OpenRouterChatAPI()
        .postChat(
          messages,
          config.model,
          "chat",
          "LLM",
          config.requestSettings,
        );

      return parseChapterDraft(response);
    });
  }

  private async resolveChapterModel(): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
  }> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return {
      model: systemPrompts?.chapterSummaryModel || undefined,
      requestSettings: systemPrompts?.chapterSummaryRequestSettings,
    };
  }
}

export const parseChapterDraft = (response: string): ChapterDraft => {
  const json = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let draft: Partial<ChapterDraft>;
  try {
    draft = JSON.parse(json) as Partial<ChapterDraft>;
  } catch {
    throw new Error("The chapter draft response was not valid JSON.");
  }

  if (!draft.title?.trim() || !draft.summary?.trim()) {
    throw new Error("The chapter draft response was incomplete.");
  }

  return {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
  };
};
