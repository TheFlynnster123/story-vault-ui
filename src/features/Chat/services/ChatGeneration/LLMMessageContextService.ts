import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";
import { d } from "../../../../services/Dependencies";
import { toSystemMessage } from "../../../../services/Utils/MessageUtils";
import type { Memory } from "../../../Memories/services/Memory";
import type { ChatSettings } from "../Chat/ChatSettings";
import { DEFAULT_SYSTEM_PROMPTS } from "../../../Prompts/services/SystemPrompts";

import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";

export const getLLMMessageContextServiceInstance = createInstanceCache(
  (chatId: string) => new LLMMessageContextService(chatId),
);

export class LLMMessageContextService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Public API ----

  async buildGenerationRequestMessages(
    includeResponsePrompt: boolean = true,
  ): Promise<LLMMessage[]> {
    const chatSettings = await this.fetchChatSettings();
    const chatMessages = this.getChatMessages();
    const memories = await this.fetchMemories();

    return this.assembleGenerationMessages(
      chatSettings,
      chatMessages,
      memories,
      includeResponsePrompt,
    );
  }

  async buildRegenerationRequestMessages(
    originalContent: string,
    feedback?: string,
  ): Promise<LLMMessage[]> {
    const baseMessages = await this.buildGenerationRequestMessages(false);
    return this.appendFeedbackMessage(baseMessages, originalContent, feedback);
  }

  async buildChapterSummaryRequestMessages(): Promise<LLMMessage[]> {
    const chatMessages = this.getChatMessages();
    const chapterSummaryPrompt = await this.fetchChapterSummaryPrompt();
    return this.assembleChapterSummaryMessages(chatMessages, chapterSummaryPrompt);
  }

  async buildChapterTitleRequestMessages(): Promise<LLMMessage[]> {
    const chatMessages = this.getChatMessages();
    const chapterTitlePrompt = await this.fetchChapterTitlePrompt();
    return this.assembleChapterTitleMessages(chatMessages, chapterTitlePrompt);
  }

  buildMemoryMessages(memories: Memory[]): LLMMessage[] {
    const content = this.combineMemoryContent(memories);
    if (!content) return [];

    return [toSystemMessage(`# Memories\r\n${content}`)];
  }

  // ---- Private: Data Fetching ----

  private fetchChatSettings(): Promise<ChatSettings> {
    return d.ChatSettingsService(this.chatId).Get() as Promise<ChatSettings>;
  }

  private getChatMessages(): LLMMessage[] {
    return d.LLMChatProjection(this.chatId).GetMessages();
  }

  private async fetchMemories(): Promise<Memory[]> {
    return d.MemoriesService(this.chatId).get();
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

  // ---- Private: Message Assembly ----

  private assembleGenerationMessages(
    chatSettings: ChatSettings,
    chatMessages: LLMMessage[],
    memories: Memory[],
    includeStoryPrompt: boolean,
  ): LLMMessage[] {
    const messages: LLMMessage[] = [
      ...chatMessages,
      ...this.buildMemoryMessages(memories),
    ];

    if (includeStoryPrompt)
      messages.push(this.createStoryPromptMessage(chatSettings));

    return messages;
  }

  private assembleChapterSummaryMessages(
    chatMessages: LLMMessage[],
    chapterSummaryPrompt: string,
  ): LLMMessage[] {
    return [...chatMessages, toSystemMessage(chapterSummaryPrompt)];
  }

  private assembleChapterTitleMessages(
    chatMessages: LLMMessage[],
    chapterTitlePrompt: string,
  ): LLMMessage[] {
    return [...chatMessages, toSystemMessage(chapterTitlePrompt)];
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
    if (feedbackMessage) messages.push(toSystemMessage(feedbackMessage));
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

  private isNonEmptyContent(content: string): boolean {
    return content.trim().length > 0;
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
}
