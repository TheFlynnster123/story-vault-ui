import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { OpenRouterRequestSettings } from "../../../OpenRouter/services/OpenRouterRequestSettings";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../../services/Utils/MessageUtils";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";
import type { LLMContextSelection } from "./LLMMessageContextService";
import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";

const BOOK_CONTEXT_SELECTION = {
  characterSheets: true,
} as const satisfies LLMContextSelection;

type BookTextKind = "summary" | "title";

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
    return this.generateBookText(chapterSummaries, "summary");
  }

  async generateBookTitle(
    chapterSummaries: string[],
  ): Promise<string | undefined> {
    return this.generateBookText(chapterSummaries, "title");
  }

  private generateBookText(
    chapterSummaries: string[],
    kind: BookTextKind,
  ): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const [contextMessages, config] = await Promise.all([
        d
          .LLMMessageContextService(this.chatId)
          .buildContext(BOOK_CONTEXT_SELECTION),
        this.resolveBookConfig(kind),
      ]);
      const requestMessages = buildBookRequestMessages(
        contextMessages,
        chapterSummaries,
        config.prompt,
      );

      this.setStatus(`Generating book ${kind}...`);
      return await d
        .OpenRouterChatAPI()
        .postChat(
          requestMessages,
          config.model,
          "chat",
          "LLM",
          config.requestSettings,
        );
    });
  }

  private async resolveBookConfig(kind: BookTextKind): Promise<{
    model: string | undefined;
    requestSettings: OpenRouterRequestSettings | undefined;
    prompt: string;
  }> {
    const systemPrompts = await d.SystemPromptsService().Get();
    const isSummary = kind === "summary";
    return isSummary
      ? {
          model: systemPrompts?.bookSummaryModel || undefined,
          requestSettings: systemPrompts?.bookSummaryRequestSettings,
          prompt:
            systemPrompts?.bookSummaryPrompt ||
            DEFAULT_SYSTEM_PROMPTS.bookSummaryPrompt,
        }
      : {
          model: systemPrompts?.bookTitleModel || undefined,
          requestSettings: systemPrompts?.bookTitleRequestSettings,
          prompt:
            systemPrompts?.bookTitlePrompt ||
            DEFAULT_SYSTEM_PROMPTS.bookTitlePrompt,
        };
  }
}

const buildBookRequestMessages = (
  contextMessages: LLMMessage[],
  chapterSummaries: string[],
  prompt: string,
): LLMMessage[] => {
  const summariesContent = chapterSummaries
    .map((summary, index) => `Chapter ${index + 1}:\n${summary}`)
    .join("\n\n");

  return [
    ...contextMessages,
    toSystemMessage(summariesContent),
    toUserMessage(prompt),
  ];
};
