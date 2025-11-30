import { ChatSettingsUtils, type ChatSettings, type Plan } from "../../models";
import type { Memory } from "../../models/Memory";
import type { LLMMessage } from "../../cqrs/LLMChatProjection";
import { toSystemMessage } from "../../utils/messageUtils";
import { d } from "../Dependencies/Dependencies";

const CHAPTER_SUMMARY_PROMPT: string =
  "Review the conversation above and generate a brief summary of the current chapter. Focus on the key events, character developments, and plot progression. Keep the summary to about a paragraph. Provide your summary directly without a preamble.";

// ---- Singleton instances ----
const llmMessageContextServiceInstances = new Map<
  string,
  LLMMessageContextService
>();

export const getLLMMessageContextServiceInstance = (
  chatId: string | null
): LLMMessageContextService | null => {
  if (!chatId) return null;

  if (!llmMessageContextServiceInstances.has(chatId))
    llmMessageContextServiceInstances.set(
      chatId,
      new LLMMessageContextService(chatId)
    );

  return llmMessageContextServiceInstances.get(chatId)!;
};

export class LLMMessageContextService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Public API ----

  async buildGenerationRequestMessages(
    includeResponsePrompt: boolean = true
  ): Promise<LLMMessage[]> {
    const chatSettings = await this.fetchChatSettings();
    const chatMessages = this.getChatMessages();
    const plans = await this.fetchUpdatedPlans(chatMessages);
    const memories = await this.fetchMemories();

    return this.assembleGenerationMessages(
      chatSettings,
      chatMessages,
      plans,
      memories,
      includeResponsePrompt
    );
  }

  async buildRegenerationRequestMessages(
    originalContent: string,
    feedback?: string
  ): Promise<LLMMessage[]> {
    const baseMessages = await this.buildGenerationRequestMessages(false);
    return this.appendFeedbackMessage(baseMessages, originalContent, feedback);
  }

  async buildChapterSummaryRequestMessages(): Promise<LLMMessage[]> {
    const chatMessages = this.getChatMessages();
    return this.assembleChapterSummaryMessages(chatMessages);
  }

  buildPlanMessages(plans: Plan[]): LLMMessage[] {
    return plans.map((plan) => this.planToSystemMessage(plan));
  }

  buildMemoryMessages(memories: Memory[]): LLMMessage[] {
    const content = this.combineMemoryContent(memories);
    if (!content) return [];

    return [toSystemMessage(`# Memories\r\n${content}`)];
  }

  buildStoryMessages(chatSettings: ChatSettings): LLMMessage[] {
    if (!this.hasStoryContent(chatSettings)) return [];
    return [toSystemMessage(`# Story\r\n${chatSettings.story}`)];
  }

  // ---- Private: Data Fetching ----

  private async fetchChatSettings(): Promise<ChatSettings> {
    return d.ChatSettingsService(this.chatId).get();
  }

  private getChatMessages(): LLMMessage[] {
    return d.LLMChatProjection(this.chatId).GetMessages();
  }

  private async fetchUpdatedPlans(chatMessages: LLMMessage[]): Promise<Plan[]> {
    const service = d.PlanService(this.chatId);
    await service.generateUpdatedPlans(chatMessages);
    return service.getPlans();
  }

  private async fetchMemories(): Promise<Memory[]> {
    return d.MemoriesService(this.chatId).get();
  }

  // ---- Private: Message Assembly ----

  private assembleGenerationMessages(
    chatSettings: ChatSettings,
    chatMessages: LLMMessage[],
    plans: Plan[],
    memories: Memory[],
    includeStoryPrompt: boolean
  ): LLMMessage[] {
    const messages: LLMMessage[] = [
      ...this.buildStoryMessages(chatSettings),
      ...chatMessages,
      ...this.buildPlanMessages(plans),
      ...this.buildMemoryMessages(memories),
    ];

    if (includeStoryPrompt)
      messages.push(this.createStoryPromptMessage(chatSettings));

    return messages;
  }

  private assembleChapterSummaryMessages(
    chatMessages: LLMMessage[]
  ): LLMMessage[] {
    return [...chatMessages, this.createChapterSummaryPromptMessage()];
  }

  private appendFeedbackMessage(
    messages: LLMMessage[],
    originalContent: string,
    feedback?: string
  ): LLMMessage[] {
    const feedbackMessage = this.buildTemporaryFeedbackMessage(
      originalContent,
      feedback
    );
    if (feedbackMessage) messages.push(toSystemMessage(feedbackMessage));
    return messages;
  }

  // ---- Private: Message Creators ----

  private createStoryPromptMessage(chatSettings: ChatSettings): LLMMessage {
    return toSystemMessage(ChatSettingsUtils.getStoryPrompt(chatSettings));
  }

  private createChapterSummaryPromptMessage(): LLMMessage {
    return toSystemMessage(CHAPTER_SUMMARY_PROMPT);
  }

  private planToSystemMessage(plan: Plan): LLMMessage {
    return toSystemMessage(`${plan.name}\n${plan.content ?? ""}`);
  }

  // ---- Private: Helpers ----

  private hasStoryContent(chatSettings: ChatSettings): boolean {
    return !!chatSettings?.story?.trim();
  }

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
    feedback?: string
  ): string | undefined {
    if (!this.hasFeedback(feedback)) return undefined;
    return this.formatFeedbackMessage(originalContent, feedback!);
  }

  private hasFeedback(feedback?: string): boolean {
    return feedback !== undefined && !!feedback.trim();
  }

  private formatFeedbackMessage = (
    originalContent: string | undefined,
    feedback: string
  ): string =>
    `The previous response was: "${originalContent}"\n\nPlease regenerate with this feedback: ${feedback}`;
}
