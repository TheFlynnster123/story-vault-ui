import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { OpenRouterRequestSettings } from "../../../OpenRouter/services/OpenRouterRequestSettings";
import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";
import { toUserMessage } from "../../../../services/Utils/MessageUtils";
import {
  DEFAULT_SYSTEM_PROMPTS,
  type SystemPrompts,
} from "../../../Prompts/services/SystemPrompts";
import type { LLMContextSelection } from "./LLMMessageContextService";

const CHAPTER_CONTEXT_SELECTION = {
  history: true,
  memories: true,
  characterSheets: true,
  continuityHistories: true,
  plans: true,
} as const satisfies LLMContextSelection;

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
      const [contextMessages, config] = await Promise.all([
        d
          .LLMMessageContextService(this.chatId)
          .buildContext(CHAPTER_CONTEXT_SELECTION, {
            historyOverride: snapshot,
          }),
        this.resolveChapterConfig(),
      ]);
      const messages = [
        ...contextMessages,
        toUserMessage(buildChapterDraftPrompt(config.prompts)),
      ];
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

  private async resolveChapterConfig(): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
    prompts: SystemPrompts;
  }> {
    const prompts =
      (await d.SystemPromptsService().Get()) ?? DEFAULT_SYSTEM_PROMPTS;
    return {
      model: prompts.chapterSummaryModel || undefined,
      requestSettings: prompts.chapterSummaryRequestSettings,
      prompts,
    };
  }
}

const buildChapterDraftPrompt = (prompts: SystemPrompts): string =>
  [
    prompts.chapterSummaryPrompt || DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt,
    prompts.chapterTitlePrompt || DEFAULT_SYSTEM_PROMPTS.chapterTitlePrompt,
    "Return one JSON object with exactly two string fields: title and summary.",
    "Do not use markdown fences or include any text outside the JSON object.",
  ].join("\n\n");

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
