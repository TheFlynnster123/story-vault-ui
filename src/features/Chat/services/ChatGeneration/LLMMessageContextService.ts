import type {
  LLMContextProjectionPolicy,
  LLMContextProjectionTraceEntry,
  LLMMessage,
} from "../../../../services/CQRS/LLMChatProjection";
import { d } from "../../../../services/Dependencies";
import { toSystemMessage } from "../../../../services/Utils/MessageUtils";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { CharacterDescription } from "../../../Characters/services/CharacterDescription";
import {
  isCharacterActive,
  isCharacterTracked,
} from "../../../Characters/services/CharacterDescription";
import { normalizeCharacterSheetTrailingMessageCount } from "../../../Characters/services/CharacterSheetSettings";
import type { ContinuityHistoryContextResult } from "../../../Histories/services/ContinuityHistoryContextService";
import type { Memory } from "../../../Memories/services/Memory";
import {
  DEFAULT_TRAILING_CHAPTER_MESSAGES,
  normalizeMessageCompressionAfterMessages,
  type SystemSettings,
} from "../../../SystemSettings/services/SystemSettings";
import {
  DEFAULT_REASONING_RETENTION_MESSAGES,
  type ChatSettings,
} from "../Chat/ChatSettings";
import {
  createContextDocument,
  renderContextDocumentMessages,
  traceContextDocument,
  type ContextDocument,
  type ContextSectionTrace,
} from "./ContextDocument";

export const getLLMMessageContextServiceInstance = createInstanceCache(
  (chatId: string) => new LLMMessageContextService(chatId),
);

export interface LLMContextSelection {
  history?: true;
  memories?: true;
  characterSheets?: true;
  continuityHistories?: true;
  plans?: true;
  recentHistoryOnly?: true;
}

export interface LLMContextInput {
  beforeMessageId?: string;
  historyOverride?: readonly LLMMessage[];
  disableMessageCompression?: true;
}

export interface ContextRequestTrace {
  projection: LLMContextProjectionTraceEntry[];
  sections: ContextSectionTrace[];
}

export interface ContextRequest {
  messages: LLMMessage[];
  document: ContextDocument;
  trace: ContextRequestTrace;
}

interface SelectedContextSources {
  chatSettings?: ChatSettings;
  systemSettings?: SystemSettings;
  memories: Memory[];
  characters: CharacterDescription[];
}

const RECENT_HISTORY_MESSAGE_COUNT = 12;

const EMPTY_CONTINUITY_CONTEXT: ContinuityHistoryContextResult = {
  messages: [],
  selections: [],
  trailingMessageCount: 0,
};

export class LLMMessageContextService {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async buildContext(
    selection: LLMContextSelection = {},
    input: LLMContextInput = {},
  ): Promise<LLMMessage[]> {
    return (await this.buildContextWithTrace(selection, input)).messages;
  }

  async buildContextWithTrace(
    selection: LLMContextSelection = {},
    input: LLMContextInput = {},
  ): Promise<ContextRequest> {
    const needsProjection = this.needsProjection(selection, input);
    const sources = await this.loadSelectedSources(
      selection,
      input,
      needsProjection,
    );
    const projection = this.resolveProjection(
      selection,
      input,
      sources,
      needsProjection,
    );
    const projectionTrace = this.truncateProjectionTrace(
      projection,
      input.beforeMessageId,
    );
    const availableHistory = this.selectAvailableHistory(
      projection.messages,
      selection,
      input.beforeMessageId,
    );
    const selectedHistory = this.selectHistory(availableHistory, selection);
    const continuityHistoryContext = selection.continuityHistories
      ? await d
          .ContinuityHistoryContextService(this.chatId)
          .buildContext(availableHistory, input.beforeMessageId)
      : EMPTY_CONTINUITY_CONTEXT;
    const document = this.createContextDocument(
      selectedHistory,
      selection,
      sources,
      continuityHistoryContext,
    );

    return {
      messages: renderContextDocumentMessages(document),
      document,
      trace: {
        projection: projectionTrace,
        sections: traceContextDocument(document),
      },
    };
  }

  private buildMemoryMessages(memories: Memory[]): LLMMessage[] {
    const content = memories
      .map((memory) => memory.content)
      .filter(this.hasText)
      .join("\r\n");
    return content ? [toSystemMessage(`# Memories\r\n${content}`)] : [];
  }

  private buildCharacterSheetMessages(
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

  private needsProjection(
    selection: LLMContextSelection,
    input: LLMContextInput,
  ): boolean {
    if (input.historyOverride) return false;
    return Boolean(
      selection.history ||
        selection.plans ||
        selection.continuityHistories,
    );
  }

  private async loadSelectedSources(
    selection: LLMContextSelection,
    input: LLMContextInput,
    needsProjection: boolean,
  ): Promise<SelectedContextSources> {
    const needsChatSettings =
      needsProjection ||
      Boolean(
        input.historyOverride &&
          (selection.memories || selection.characterSheets),
      );

    const [chatSettings, systemSettings, memories, characters] =
      await Promise.all([
        needsChatSettings
          ? this.fetchChatSettings()
          : Promise.resolve(undefined),
        needsProjection
          ? this.fetchSystemSettings()
          : Promise.resolve(undefined),
        selection.memories ? this.fetchMemories() : Promise.resolve([]),
        selection.characterSheets
          ? this.fetchCharacterDescriptions()
          : Promise.resolve([]),
      ]);

    return {
      chatSettings,
      systemSettings,
      memories,
      characters,
    };
  }

  private resolveProjection(
    selection: LLMContextSelection,
    input: LLMContextInput,
    sources: SelectedContextSources,
    needsProjection: boolean,
  ): {
    messages: LLMMessage[];
    trace: LLMContextProjectionTraceEntry[];
  } {
    if (input.historyOverride) {
      return {
        messages: input.historyOverride.map((message) => ({ ...message })),
        trace: [],
      };
    }
    if (!needsProjection || !sources.chatSettings) {
      return { messages: [], trace: [] };
    }

    return d.LLMChatProjection(this.chatId).GetContext(
      this.createProjectionPolicy(
        sources.chatSettings,
        sources.systemSettings,
        selection,
        input,
      ),
    );
  }

  private createProjectionPolicy(
    chatSettings: ChatSettings,
    systemSettings: SystemSettings | undefined,
    selection: LLMContextSelection,
    input: LLMContextInput,
  ): LLMContextProjectionPolicy {
    const configuredCompression =
      systemSettings?.messageCompressionSettings?.enabled
        ? normalizeMessageCompressionAfterMessages(
            systemSettings.messageCompressionSettings.afterMessages,
          )
        : null;

    return {
      trailingChapterMessages:
        systemSettings?.chapterCompressionSettings?.trailingChapterMessages ??
        DEFAULT_TRAILING_CHAPTER_MESSAGES,
      reasoningRetentionMessages: this.getReasoningRetention(chatSettings),
      messageCompressionAfterMessages:
        input.disableMessageCompression
          ? null
          : configuredCompression,
      planSelection: selection.plans
        ? { mode: "include" }
        : { mode: "exclude-all" },
    };
  }

  private selectAvailableHistory(
    messages: LLMMessage[],
    selection: LLMContextSelection,
    beforeMessageId?: string,
  ): LLMMessage[] {
    const boundedMessages = beforeMessageId
      ? this.truncateMessagesBeforeId(messages, beforeMessageId)
      : messages;
    return selection.plans
      ? boundedMessages
      : boundedMessages.filter((message) => message.type !== "plan");
  }

  private selectHistory(
    availableHistory: LLMMessage[],
    selection: LLMContextSelection,
  ): LLMMessage[] {
    const selectedMessages = selection.history
      ? availableHistory
      : selection.plans
        ? availableHistory.filter((message) => message.type === "plan")
        : [];

    if (!selection.recentHistoryOnly || !selection.history) {
      return selectedMessages;
    }

    return selectedMessages
      .filter((message) => message.id)
      .slice(-RECENT_HISTORY_MESSAGE_COUNT);
  }

  private createContextDocument(
    projectedHistory: LLMMessage[],
    selection: LLMContextSelection,
    sources: SelectedContextSources,
    continuityHistoryContext: ContinuityHistoryContextResult,
  ): ContextDocument {
    return createContextDocument({
      projectedHistory,
      memoryMessages: selection.memories
        ? this.buildMemoryMessages(sources.memories)
        : [],
      characterSheetMessages: selection.characterSheets
        ? this.buildCharacterSheetMessages(sources.characters)
        : [],
      continuityHistoryMessages: continuityHistoryContext.messages,
      selectedContinuityHistories: continuityHistoryContext.selections,
      recentMessageCount: sources.chatSettings
        ? normalizeCharacterSheetTrailingMessageCount(
            sources.chatSettings.characterSheetsTrailingMessageCount,
          )
        : 0,
      continuityHistoryRecentMessageCount:
        continuityHistoryContext.trailingMessageCount,
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

  private truncateMessagesBeforeId(
    messages: LLMMessage[],
    messageId: string,
  ): LLMMessage[] {
    const index = messages.findIndex((message) => message.id === messageId);
    return index === -1 ? messages : messages.slice(0, index);
  }

  private truncateProjectionTrace(
    projection: {
      messages: LLMMessage[];
      trace: LLMContextProjectionTraceEntry[];
    },
    beforeMessageId?: string,
  ): LLMContextProjectionTraceEntry[] {
    if (!beforeMessageId) return projection.trace;
    const boundaryIndex = projection.messages.findIndex(
      (message) => message.id === beforeMessageId,
    );
    if (boundaryIndex === -1) return projection.trace;

    const truncatedIds = new Set(
      projection.messages
        .slice(boundaryIndex)
        .flatMap((message) => (message.id ? [message.id] : [])),
    );
    return projection.trace.map((entry) =>
      entry.included && truncatedIds.has(entry.id)
        ? {
            ...entry,
            included: false,
            exclusionReason: "regeneration-truncated",
          }
        : entry,
    );
  }

  private readonly hasText = (content: string | undefined): content is string =>
    content !== undefined && content.trim().length > 0;

  private fetchChatSettings(): Promise<ChatSettings> {
    return d.ChatSettingsService(this.chatId).Get() as Promise<ChatSettings>;
  }

  private fetchSystemSettings(): Promise<SystemSettings | undefined> {
    return d.SystemSettingsService().Get();
  }

  private fetchMemories(): Promise<Memory[]> {
    return d.MemoriesService(this.chatId).get();
  }

  private fetchCharacterDescriptions(): Promise<CharacterDescription[]> {
    return d.CharacterDescriptionsService(this.chatId).get();
  }
}
