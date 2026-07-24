import {
  filterReasoningMessagesByRetention,
  type LLMContextProjectionPolicy,
  type LLMMessage,
} from "../../../../services/CQRS/LLMChatProjection";
import { d } from "../../../../services/Dependencies";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../../services/Utils/MessageUtils";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { CharacterDescription } from "../../../Characters/services/CharacterDescription";
import {
  isCharacterActive,
  isCharacterTracked,
} from "../../../Characters/services/CharacterDescription";
import { normalizeCharacterSheetTrailingMessageCount } from "../../../Characters/services/CharacterSheetSettings";
import type { Memory } from "../../../Memories/services/Memory";
import {
  DEFAULT_SYSTEM_PROMPTS,
  type SystemPrompts,
} from "../../../Prompts/services/SystemPrompts";
import {
  DEFAULT_TRAILING_CHAPTER_MESSAGES,
  type SystemSettings,
} from "../../../SystemSettings/services/SystemSettings";
import type { ChatSettings } from "../Chat/ChatSettings";
import { DEFAULT_REASONING_RETENTION_MESSAGES } from "../Chat/ChatSettings";
import {
  createContextDocument,
  renderConsolidatedReasoningContext,
  renderContextDocumentMessages,
  traceContextDocument,
  type ContextDocument,
  type ContextSectionTrace,
} from "./ContextDocument";

export const getLLMMessageContextServiceInstance = createInstanceCache(
  (chatId: string) => new LLMMessageContextService(chatId),
);

export interface ContextRequestTrace {
  sections: ContextSectionTrace[];
  appendedSources: Array<"response-prompt" | "guidance">;
}

export interface ContextRequest {
  messages: LLMMessage[];
  trace: ContextRequestTrace;
}

interface ContextSources {
  chatSettings: ChatSettings;
  systemSettings?: SystemSettings;
  systemPrompts?: SystemPrompts;
  memories: Memory[];
  characters: CharacterDescription[];
}

interface ChatContextSnapshot extends ContextSources {
  projectedHistory: LLMMessage[];
}

export class LLMMessageContextService {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async buildGenerationRequestMessages(
    includeResponsePrompt = true,
    guidance?: string,
  ): Promise<LLMMessage[]> {
    const request = await this.buildGenerationRequestWithTrace(
      includeResponsePrompt,
      guidance,
    );
    return request.messages;
  }

  async buildGenerationRequestWithTrace(
    includeResponsePrompt = true,
    guidance?: string,
  ): Promise<ContextRequest> {
    const snapshot = await this.loadChatContextSnapshot();
    const document = this.createDurableContextDocument(snapshot);
    const messages = renderContextDocumentMessages(document);
    const appendedSources: ContextRequestTrace["appendedSources"] = [];

    if (includeResponsePrompt) {
      messages.push(this.createResponsePromptMessage(snapshot.chatSettings));
      appendedSources.push("response-prompt");
    }
    if (this.hasText(guidance)) {
      messages.push(toUserMessage(this.formatGuidanceMessage(guidance!)));
      appendedSources.push("guidance");
    }

    return {
      messages,
      trace: {
        sections: traceContextDocument(document),
        appendedSources,
      },
    };
  }

  async buildReasoningRequestMessages(
    guidance?: string,
  ): Promise<LLMMessage[]> {
    const snapshot = await this.loadChatContextSnapshot(true);
    const document = this.createDurableContextDocument(snapshot);
    const reasoningPrompt = this.resolveReasoningPrompt(snapshot);
    const shouldConsolidateHistory =
      snapshot.chatSettings.reasoningConsolidateMessageHistory ?? true;
    const messages = shouldConsolidateHistory
      ? [
          toSystemMessage(
            renderConsolidatedReasoningContext(document, reasoningPrompt),
          ),
        ]
      : [
          ...renderContextDocumentMessages(document),
          toSystemMessage(reasoningPrompt),
        ];

    return this.appendGuidanceMessage(messages, guidance);
  }

  async buildRegenerationRequestMessages(
    messageId: string,
    originalContent: string,
    feedback?: string,
  ): Promise<LLMMessage[]> {
    const snapshot = await this.loadChatContextSnapshot();
    const truncatedSnapshot = {
      ...snapshot,
      projectedHistory: this.truncateMessagesBeforeId(
        snapshot.projectedHistory,
        messageId,
      ),
    };
    const messages = renderContextDocumentMessages(
      this.createDurableContextDocument(truncatedSnapshot),
    );
    return this.appendFeedbackMessage(messages, originalContent, feedback);
  }

  async buildChapterDraftRequestMessages(
    snapshot: LLMMessage[],
  ): Promise<LLMMessage[]> {
    const sources = await this.loadContextSources(true, false);
    const projectedHistory = filterReasoningMessagesByRetention(
      snapshot,
      this.getReasoningRetention(sources.chatSettings),
    );
    const document = this.createDurableContextDocument({
      ...sources,
      projectedHistory,
    });
    const prompts = sources.systemPrompts;
    const draftPrompt = [
      prompts?.chapterSummaryPrompt ||
        DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt,
      prompts?.chapterTitlePrompt || DEFAULT_SYSTEM_PROMPTS.chapterTitlePrompt,
      "Return one JSON object with exactly two string fields: title and summary.",
      "Do not use markdown fences or include any text outside the JSON object.",
    ].join("\n\n");

    return [
      ...renderContextDocumentMessages(document),
      toUserMessage(draftPrompt),
    ];
  }

  async buildBookSummaryRequestMessages(
    chapterSummaries: string[],
  ): Promise<LLMMessage[]> {
    const [systemPrompts, characters] = await Promise.all([
      this.fetchSystemPrompts(),
      this.fetchCharacterDescriptions(),
    ]);
    return this.assembleBookRequestMessages(
      chapterSummaries,
      systemPrompts?.bookSummaryPrompt ||
        DEFAULT_SYSTEM_PROMPTS.bookSummaryPrompt,
      characters,
    );
  }

  async buildBookTitleRequestMessages(
    chapterSummaries: string[],
  ): Promise<LLMMessage[]> {
    const [systemPrompts, characters] = await Promise.all([
      this.fetchSystemPrompts(),
      this.fetchCharacterDescriptions(),
    ]);
    return this.assembleBookRequestMessages(
      chapterSummaries,
      systemPrompts?.bookTitlePrompt || DEFAULT_SYSTEM_PROMPTS.bookTitlePrompt,
      characters,
    );
  }

  buildMemoryMessages(memories: Memory[]): LLMMessage[] {
    const content = memories
      .map((memory) => memory.content)
      .filter(this.hasText)
      .join("\r\n");
    return content ? [toSystemMessage(`# Memories\r\n${content}`)] : [];
  }

  buildCharacterSheetMessages(
    characters: CharacterDescription[],
  ): LLMMessage[] {
    const content = characters
      .filter(
        (character) =>
          isCharacterTracked(character) &&
          isCharacterActive(character) &&
          character.sheetItems.some(this.hasText),
      )
      .map((character) =>
        [
          `## ${character.name.trim() || "Unnamed character"}`,
          ...character.sheetItems
            .filter(this.hasText)
            .map((item) => `- ${item.trim()}`),
        ].join("\n"),
      )
      .join("\n\n");

    return content ? [toSystemMessage(`# Character Sheets\r\n${content}`)] : [];
  }

  private async loadChatContextSnapshot(
    includeSystemPrompts = false,
  ): Promise<ChatContextSnapshot> {
    const sources = await this.loadContextSources(
      includeSystemPrompts,
      true,
    );
    const policy = this.createProjectionPolicy(sources);
    const projectedHistory = d
      .LLMChatProjection(this.chatId)
      .GetMessages(policy);

    return { ...sources, projectedHistory };
  }

  private async loadContextSources(
    includeSystemPrompts: boolean,
    includeSystemSettings: boolean,
  ): Promise<ContextSources> {
    const [
      chatSettings,
      systemSettings,
      systemPrompts,
      memories,
      characters,
    ] = await Promise.all([
      this.fetchChatSettings(),
      includeSystemSettings
        ? this.fetchSystemSettings()
        : Promise.resolve(undefined),
      includeSystemPrompts
        ? this.fetchSystemPrompts()
        : Promise.resolve(undefined),
      this.fetchMemories(),
      this.fetchCharacterDescriptions(),
    ]);

    return {
      chatSettings,
      systemSettings,
      systemPrompts,
      memories,
      characters,
    };
  }

  private createProjectionPolicy(
    sources: Pick<ContextSources, "chatSettings" | "systemSettings">,
  ): LLMContextProjectionPolicy {
    return {
      trailingChapterMessages:
        sources.systemSettings?.chapterCompressionSettings
          ?.trailingChapterMessages ?? DEFAULT_TRAILING_CHAPTER_MESSAGES,
      reasoningRetentionMessages: this.getReasoningRetention(
        sources.chatSettings,
      ),
    };
  }

  private createDurableContextDocument(
    snapshot: Pick<
      ChatContextSnapshot,
      | "projectedHistory"
      | "memories"
      | "characters"
      | "chatSettings"
    >,
  ): ContextDocument {
    return createContextDocument({
      projectedHistory: snapshot.projectedHistory,
      memoryMessages: this.buildMemoryMessages(snapshot.memories),
      characterSheetMessages: this.buildCharacterSheetMessages(
        snapshot.characters,
      ),
      recentMessageCount: normalizeCharacterSheetTrailingMessageCount(
        snapshot.chatSettings.characterSheetsTrailingMessageCount,
      ),
    });
  }

  private getReasoningRetention(chatSettings: ChatSettings): number | null {
    if (chatSettings.reasoningEnabled === false) return 0;
    if (chatSettings.reasoningExpiresAfterMessages === null) return null;
    return (
      chatSettings.reasoningExpiresAfterMessages ??
      DEFAULT_REASONING_RETENTION_MESSAGES
    );
  }

  private resolveReasoningPrompt(
    snapshot: Pick<ContextSources, "chatSettings" | "systemPrompts">,
  ): string {
    if (snapshot.chatSettings.reasoningPromptOverride?.trim()) {
      return snapshot.chatSettings.reasoningPromptOverride;
    }
    return (
      snapshot.systemPrompts?.reasoningPrompt ||
      DEFAULT_SYSTEM_PROMPTS.reasoningPrompt
    );
  }

  private assembleBookRequestMessages(
    chapterSummaries: string[],
    prompt: string,
    characters: CharacterDescription[],
  ): LLMMessage[] {
    const summariesContent = chapterSummaries
      .map((summary, index) => `Chapter ${index + 1}:\n${summary}`)
      .join("\n\n");
    return [
      ...this.buildCharacterSheetMessages(characters),
      toSystemMessage(summariesContent),
      toUserMessage(prompt),
    ];
  }

  private appendFeedbackMessage(
    messages: LLMMessage[],
    originalContent: string,
    feedback?: string,
  ): LLMMessage[] {
    if (!this.hasText(feedback)) return messages;
    messages.push(
      toUserMessage(
        `The previous response was: "${originalContent}"\n\nPlease regenerate with this feedback: ${feedback}`,
      ),
    );
    return messages;
  }

  private appendGuidanceMessage(
    messages: LLMMessage[],
    guidance?: string,
  ): LLMMessage[] {
    if (!this.hasText(guidance)) return messages;
    return [
      ...messages,
      toUserMessage(this.formatGuidanceMessage(guidance!)),
    ];
  }

  private createResponsePromptMessage(chatSettings: ChatSettings): LLMMessage {
    return toSystemMessage(chatSettings.prompt);
  }

  private truncateMessagesBeforeId(
    messages: LLMMessage[],
    messageId: string,
  ): LLMMessage[] {
    const index = messages.findIndex((message) => message.id === messageId);
    return index === -1 ? messages : messages.slice(0, index);
  }

  private formatGuidanceMessage(guidance: string): string {
    return `User guidance for the next response: ${guidance}`;
  }

  private readonly hasText = (content: string | undefined): content is string =>
    content !== undefined && content.trim().length > 0;

  private fetchChatSettings(): Promise<ChatSettings> {
    return d.ChatSettingsService(this.chatId).Get() as Promise<ChatSettings>;
  }

  private fetchSystemSettings(): Promise<SystemSettings | undefined> {
    return d.SystemSettingsService().Get();
  }

  private fetchSystemPrompts(): Promise<SystemPrompts | undefined> {
    return d.SystemPromptsService().Get();
  }

  private fetchMemories(): Promise<Memory[]> {
    return d.MemoriesService(this.chatId).get();
  }

  private fetchCharacterDescriptions(): Promise<CharacterDescription[]> {
    return d.CharacterDescriptionsService(this.chatId).get();
  }
}
