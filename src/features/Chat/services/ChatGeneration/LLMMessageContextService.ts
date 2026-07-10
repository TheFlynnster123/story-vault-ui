import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";
import { d } from "../../../../services/Dependencies";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../../services/Utils/MessageUtils";
import type { Memory } from "../../../Memories/services/Memory";
import type { CharacterDescription } from "../../../Characters/services/CharacterDescription";
import type { ChatSettings } from "../Chat/ChatSettings";
import { DEFAULT_REASONING_RETENTION_MESSAGES } from "../Chat/ChatSettings";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";
import { DEFAULT_TRAILING_CHAPTER_MESSAGES } from "../../../SystemSettings/services/SystemSettings";
import type { SystemSettings } from "../../../SystemSettings/services/SystemSettings";

import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";

export const getLLMMessageContextServiceInstance = createInstanceCache(
  (chatId: string) => new LLMMessageContextService(chatId),
);

export const DEFAULT_CHARACTER_SHEETS_TRAILING_MESSAGE_COUNT = 5;

const consolidateMessagesToString = (messages: LLMMessage[]): string =>
  messages
    .map((msg) => {
      const roleLabel =
        msg.role === "user"
          ? "User"
          : msg.role === "assistant"
            ? "Assistant"
            : "System";
      return `${roleLabel}: ${msg.content}`;
    })
    .join("\n\n");

export class LLMMessageContextService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Public API ----

  async buildGenerationRequestMessages(
    includeResponsePrompt: boolean = true,
    guidance?: string,
  ): Promise<LLMMessage[]> {
    const chatSettings = await this.fetchChatSettings();
    await this.applySystemContextSettings();
    const chatMessages = this.getChatMessages(chatSettings);
    const memories = await this.fetchMemories();
    const characters = await this.fetchCharacterDescriptions();

    const messages = this.assembleGenerationMessages(
      chatSettings,
      chatMessages,
      memories,
      characters,
      includeResponsePrompt,
    );

    return this.appendGuidanceMessage(messages, guidance);
  }

  async buildReasoningRequestMessages(guidance?: string): Promise<LLMMessage[]> {
    const chatSettings = await this.fetchChatSettings();
    await this.applySystemContextSettings();
    const chatMessages = this.getChatMessages(chatSettings);
    const memories = await this.fetchMemories();
    const characters = await this.fetchCharacterDescriptions();
    const reasoningPrompt = await this.fetchReasoningPrompt();
    const shouldConsolidateHistory =
      chatSettings.reasoningConsolidateMessageHistory ?? true;

    if (shouldConsolidateHistory) {
      const consolidatedReasoningContext = this.buildConsolidatedReasoningContext(
        chatMessages,
        memories,
        characters,
        chatSettings,
        reasoningPrompt,
      );
      return this.appendGuidanceMessage(
        [toSystemMessage(consolidatedReasoningContext)],
        guidance,
      );
    }

    const messages = [
      ...this.assembleDurableContextMessages(
        chatMessages,
        memories,
        characters,
        chatSettings,
      ),
      toSystemMessage(reasoningPrompt),
    ];

    return this.appendGuidanceMessage(messages, guidance);
  }

  async buildRegenerationRequestMessages(
    messageId: string,
    originalContent: string,
    feedback?: string,
  ): Promise<LLMMessage[]> {
    const chatSettings = await this.fetchChatSettings();
    await this.applySystemContextSettings();
    const chatMessages = this.getChatMessages(chatSettings);
    const memories = await this.fetchMemories();
    const characters = await this.fetchCharacterDescriptions();
    const truncatedChatMessages = this.truncateMessagesBeforeId(
      chatMessages,
      messageId,
    );
    const truncatedMessages = this.assembleGenerationMessages(
      chatSettings,
      truncatedChatMessages,
      memories,
      characters,
      false,
    );
    return this.appendFeedbackMessage(
      truncatedMessages,
      originalContent,
      feedback,
    );
  }

  async buildChapterSummaryRequestMessages(): Promise<LLMMessage[]> {
    const chatSettings = await this.fetchChatSettings();
    await this.applySystemContextSettings();
    const chatMessages = this.getChatMessages(chatSettings);
    const memories = await this.fetchMemories();
    const characters = await this.fetchCharacterDescriptions();
    const chapterSummaryPrompt = await this.fetchChapterSummaryPrompt();
    return this.assembleChapterSummaryMessages(
      this.assembleDurableContextMessages(
        chatMessages,
        memories,
        characters,
        chatSettings,
      ),
      chapterSummaryPrompt,
    );
  }

  async buildChapterTitleRequestMessages(): Promise<LLMMessage[]> {
    const chatSettings = await this.fetchChatSettings();
    await this.applySystemContextSettings();
    const chatMessages = this.getChatMessages(chatSettings);
    const memories = await this.fetchMemories();
    const characters = await this.fetchCharacterDescriptions();
    const chapterTitlePrompt = await this.fetchChapterTitlePrompt();
    return this.assembleChapterTitleMessages(
      this.assembleDurableContextMessages(
        chatMessages,
        memories,
        characters,
        chatSettings,
      ),
      chapterTitlePrompt,
    );
  }

  async buildBookSummaryRequestMessages(
    chapterSummaries: string[],
  ): Promise<LLMMessage[]> {
    const bookSummaryPrompt = await this.fetchBookSummaryPrompt();
    const characters = await this.fetchCharacterDescriptions();
    return this.assembleBookSummaryMessages(
      chapterSummaries,
      bookSummaryPrompt,
      characters,
    );
  }

  async buildBookTitleRequestMessages(
    chapterSummaries: string[],
  ): Promise<LLMMessage[]> {
    const bookTitlePrompt = await this.fetchBookTitlePrompt();
    const characters = await this.fetchCharacterDescriptions();
    return this.assembleBookTitleMessages(
      chapterSummaries,
      bookTitlePrompt,
      characters,
    );
  }

  buildMemoryMessages(memories: Memory[]): LLMMessage[] {
    const content = this.combineMemoryContent(memories);
    if (!content) return [];

    return [toSystemMessage(`# Memories\r\n${content}`)];
  }

  buildCharacterSheetMessages(
    characters: CharacterDescription[],
  ): LLMMessage[] {
    const content = characters
      .filter((character) => this.isNonEmptyContent(character.sheet ?? ""))
      .map(
        (character) =>
          `## ${character.name.trim() || "Unnamed character"}\r\n${character.sheet!.trim()}`,
      )
      .join("\r\n\r\n");
    if (!content) return [];

    return [toSystemMessage(`# Character Sheets\r\n${content}`)];
  }

  // ---- Private: Data Fetching ----

  private fetchChatSettings(): Promise<ChatSettings> {
    return d.ChatSettingsService(this.chatId).Get() as Promise<ChatSettings>;
  }

  private getChatMessages(chatSettings: ChatSettings): LLMMessage[] {
    return d.LLMChatProjection(this.chatId).GetMessages();
  }

  private async applySystemContextSettings(): Promise<void> {
    const settings = await this.fetchSystemSettings();
    const chatSettings = await this.fetchChatSettings();
    const projection = d.LLMChatProjection(this.chatId);

    projection.SetPreviousChapterMessageBuffer(
      settings?.chapterCompressionSettings?.trailingChapterMessages ??
        DEFAULT_TRAILING_CHAPTER_MESSAGES,
    );

    projection.SetReasoningRetention(
      this.getReasoningRetention(chatSettings),
    );
  }

  private getReasoningRetention(chatSettings: ChatSettings): number | null {
    if (chatSettings.reasoningEnabled === false) return 0;
    if (chatSettings.reasoningExpiresAfterMessages === null) return null;
    return (
      chatSettings.reasoningExpiresAfterMessages ??
      DEFAULT_REASONING_RETENTION_MESSAGES
    );
  }

  private fetchSystemSettings(): Promise<SystemSettings | undefined> {
    return d.SystemSettingsService().Get();
  }

  private async fetchMemories(): Promise<Memory[]> {
    return d.MemoriesService(this.chatId).get();
  }

  private async fetchCharacterDescriptions(): Promise<CharacterDescription[]> {
    return d.CharacterDescriptionsService(this.chatId).get();
  }

  private async fetchChapterSummaryPrompt(): Promise<string> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return (
      systemPrompts?.chapterSummaryPrompt ||
      DEFAULT_SYSTEM_PROMPTS.chapterSummaryPrompt
    );
  }

  private async fetchChapterTitlePrompt(): Promise<string> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return (
      systemPrompts?.chapterTitlePrompt ||
      DEFAULT_SYSTEM_PROMPTS.chapterTitlePrompt
    );
  }

  private async fetchBookSummaryPrompt(): Promise<string> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return (
      systemPrompts?.bookSummaryPrompt ||
      DEFAULT_SYSTEM_PROMPTS.bookSummaryPrompt
    );
  }

  private async fetchBookTitlePrompt(): Promise<string> {
    const systemPrompts = await d.SystemPromptsService().Get();
    return (
      systemPrompts?.bookTitlePrompt || DEFAULT_SYSTEM_PROMPTS.bookTitlePrompt
    );
  }

  private async fetchReasoningPrompt(): Promise<string> {
    const chatSettings = await this.fetchChatSettings();
    if (chatSettings.reasoningPromptOverride?.trim()) {
      return chatSettings.reasoningPromptOverride;
    }

    const systemPrompts = await d.SystemPromptsService().Get();
    return (
      systemPrompts?.reasoningPrompt || DEFAULT_SYSTEM_PROMPTS.reasoningPrompt
    );
  }

  // ---- Private: Message Assembly ----

  private assembleGenerationMessages(
    chatSettings: ChatSettings,
    chatMessages: LLMMessage[],
    memories: Memory[],
    characters: CharacterDescription[],
    includeStoryPrompt: boolean,
  ): LLMMessage[] {
    const messages = this.assembleDurableContextMessages(
      chatMessages,
      memories,
      characters,
      chatSettings,
    );

    if (includeStoryPrompt)
      messages.push(this.createStoryPromptMessage(chatSettings));

    return messages;
  }

  private assembleChapterSummaryMessages(
    chatMessages: LLMMessage[],
    chapterSummaryPrompt: string,
  ): LLMMessage[] {
    return [...chatMessages, toUserMessage(chapterSummaryPrompt)];
  }

  private assembleChapterTitleMessages(
    chatMessages: LLMMessage[],
    chapterTitlePrompt: string,
  ): LLMMessage[] {
    return [...chatMessages, toUserMessage(chapterTitlePrompt)];
  }

  private assembleBookSummaryMessages(
    chapterSummaries: string[],
    bookSummaryPrompt: string,
    characters: CharacterDescription[],
  ): LLMMessage[] {
    const summariesContent = chapterSummaries
      .map((s, i) => `Chapter ${i + 1}:\n${s}`)
      .join("\n\n");
    return [
      ...this.buildCharacterSheetMessages(characters),
      toSystemMessage(summariesContent),
      toUserMessage(bookSummaryPrompt),
    ];
  }

  private assembleBookTitleMessages(
    chapterSummaries: string[],
    bookTitlePrompt: string,
    characters: CharacterDescription[],
  ): LLMMessage[] {
    const summariesContent = chapterSummaries
      .map((s, i) => `Chapter ${i + 1}:\n${s}`)
      .join("\n\n");
    return [
      ...this.buildCharacterSheetMessages(characters),
      toSystemMessage(summariesContent),
      toUserMessage(bookTitlePrompt),
    ];
  }

  private buildConsolidatedReasoningContext(
    chatMessages: LLMMessage[],
    memories: Memory[],
    characters: CharacterDescription[],
    chatSettings: ChatSettings,
    reasoningPrompt: string,
  ): string {
    const { earlierMessages, trailingMessages } = this.splitMessagesForDurableContext(
      chatMessages,
      chatSettings,
    );
    const sections = [
      `Chat History:\n\n${consolidateMessagesToString(earlierMessages)}`,
    ];
    const memoryContent = this.combineMemoryContent(memories);
    if (memoryContent) {
      sections.push(`Memories:\n\n${memoryContent}`);
    }
    const characterSheetContent = this.combineCharacterSheetContent(characters);
    if (characterSheetContent) {
      sections.push(`Character Sheets:\n\n${characterSheetContent}`);
    }
    if (trailingMessages.length) {
      sections.push(
        `Recent Chat History:\n\n${consolidateMessagesToString(trailingMessages)}`,
      );
    }
    sections.push(`Reasoning Instructions:\n\n${reasoningPrompt}`);
    return sections.join("\n\n---\n\n");
  }

  private appendFeedbackMessage(
    messages: LLMMessage[],
    originalContent: string,
    feedback?: string,
  ): LLMMessage[] {
    const feedbackMessage = this.buildTemporaryFeedbackMessage(
      originalContent,
      feedback,
    );
    if (feedbackMessage) messages.push(toUserMessage(feedbackMessage));
    return messages;
  }

  // ---- Private: Message Creators ----

  private createStoryPromptMessage(chatSettings: ChatSettings): LLMMessage {
    return toSystemMessage(chatSettings.prompt);
  }

  // ---- Private: Helpers ----

  private combineMemoryContent(memories: Memory[]): string {
    return memories
      .map((memory) => memory.content)
      .filter((content) => this.isNonEmptyContent(content))
      .join("\r\n");
  }

  private combineCharacterSheetContent(
    characters: CharacterDescription[],
  ): string {
    return characters
      .filter((character) => this.isNonEmptyContent(character.sheet ?? ""))
      .map(
        (character) =>
          `## ${character.name.trim() || "Unnamed character"}\n${character.sheet!.trim()}`,
      )
      .join("\n\n");
  }

  private assembleDurableContextMessages(
    chatMessages: LLMMessage[],
    memories: Memory[],
    characters: CharacterDescription[],
    chatSettings: ChatSettings,
  ): LLMMessage[] {
    const { earlierMessages, trailingMessages } = this.splitMessagesForDurableContext(
      chatMessages,
      chatSettings,
    );
    return [
      ...earlierMessages,
      ...this.buildMemoryMessages(memories),
      ...this.buildCharacterSheetMessages(characters),
      ...trailingMessages,
    ];
  }

  private splitMessagesForDurableContext(
    chatMessages: LLMMessage[],
    chatSettings: ChatSettings,
  ): { earlierMessages: LLMMessage[]; trailingMessages: LLMMessage[] } {
    const trailingCount = this.getCharacterSheetsTrailingMessageCount(
      chatSettings,
    );
    const splitIndex = Math.max(0, chatMessages.length - trailingCount);
    return {
      earlierMessages: chatMessages.slice(0, splitIndex),
      trailingMessages: chatMessages.slice(splitIndex),
    };
  }

  private getCharacterSheetsTrailingMessageCount(
    chatSettings: ChatSettings,
  ): number {
    const configured = chatSettings.characterSheetsTrailingMessageCount;
    if (!Number.isFinite(configured)) {
      return DEFAULT_CHARACTER_SHEETS_TRAILING_MESSAGE_COUNT;
    }
    return Math.max(0, Math.min(50, Math.round(configured!)));
  }

  private isNonEmptyContent(content: string): boolean {
    return content.trim().length > 0;
  }

  private truncateMessagesBeforeId(
    messages: LLMMessage[],
    messageId: string,
  ): LLMMessage[] {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return messages;
    return messages.slice(0, index);
  }

  private buildTemporaryFeedbackMessage(
    originalContent: string | undefined,
    feedback?: string,
  ): string | undefined {
    if (!this.hasFeedback(feedback)) return undefined;
    return this.formatFeedbackMessage(originalContent, feedback!);
  }

  private hasFeedback(feedback?: string): boolean {
    return feedback !== undefined && !!feedback.trim();
  }

  private formatFeedbackMessage = (
    originalContent: string | undefined,
    feedback: string,
  ): string =>
    `The previous response was: "${originalContent}"\n\nPlease regenerate with this feedback: ${feedback}`;

  private appendGuidanceMessage(
    messages: LLMMessage[],
    guidance?: string,
  ): LLMMessage[] {
    if (!this.hasFeedback(guidance)) return messages;
    return [...messages, toUserMessage(this.formatGuidanceMessage(guidance!))];
  }

  private formatGuidanceMessage = (guidance: string): string =>
    `User guidance for the next response: ${guidance}`;
}
