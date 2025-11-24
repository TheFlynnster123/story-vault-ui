import type { ChatSettings, Note } from "../../models";
import type { Memory } from "../../models/Memory";
import { FirstPersonCharacterPrompt } from "../../templates/FirstPersonCharacterTemplate";
import { toSystemMessage } from "../../utils/messageUtils";
import { d } from "../Dependencies/Dependencies";
import type { LLMMessage } from "../../cqrs/LLMChatProjection";

const RESPONSE_PROMPT: string =
  "Consider the above notes, write a response to the conversation. Provide your response directly without a preamble.";

// Singleton instances
const chatGenerationInstances = new Map<string, ChatGeneration>();

export const getChatGenerationInstance = (
  chatId: string | null
): ChatGeneration | null => {
  if (!chatId) return null;

  if (!chatGenerationInstances.has(chatId))
    chatGenerationInstances.set(chatId, new ChatGeneration(chatId));

  return chatGenerationInstances.get(chatId)!;
};

export class ChatGeneration {
  public IsLoading: boolean = false;
  public Status?: string;

  private chatId: string;
  private subscribers = new Set<() => void>();

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  private setIsLoading = (isLoading: boolean) => {
    this.IsLoading = isLoading;
    this.notifySubscribers();
  };

  private setStatus = (status?: string) => {
    this.Status = status;
    this.notifySubscribers();
  };

  async generateResponse(): Promise<string | undefined> {
    const chatId = this.chatId;

    this.setIsLoading(true);

    try {
      const requestMessages = await this.buildGenerationRequestMessages();

      this.setStatus("Generating response...");
      const response = await d.GrokChatAPI().postChat(requestMessages);

      this.setStatus("Saving...");
      await d.ChatService(chatId).AddSystemMessage(response);

      return response;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  async generateImage(): Promise<void> {
    this.setIsLoading(true);

    try {
      this.setStatus("Generating image prompt...");
      const messageList = d.LLMChatProjection(this.chatId).GetMessages();
      const generatedPrompt = await d
        .ImageGenerator()
        .generatePrompt(messageList);

      this.setStatus("Triggering image generation...");
      const jobId = await d.ImageGenerator().triggerJob(generatedPrompt);

      this.setStatus("Saving job...");
      await d.ChatService(this.chatId).CreateCivitJob(jobId, generatedPrompt);
    } catch (e) {
      d.ErrorService().log("Failed to generate image", e);
      throw e;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  async regenerateResponse(
    messageId: string,
    feedback?: string
  ): Promise<string | undefined> {
    const message = d.LLMChatProjection(this.chatId).GetMessage(messageId);

    if (!message) {
      console.warn(`Message with id ${messageId} not found`);
      return;
    }

    const chatId = this.chatId;

    this.setIsLoading(true);

    try {
      const originalContent = message.content;

      await d.ChatService(chatId).DeleteMessage(messageId);

      const requestMessages = await this.buildRegenerationRequestMessages(
        originalContent,
        feedback
      );

      this.setStatus("Generating response...");
      const response = await d.GrokChatAPI().postChat(requestMessages);

      this.setStatus("Saving...");
      await d.ChatService(chatId).AddSystemMessage(response);

      return response;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  async generateChapterSummary(): Promise<string | undefined> {
    this.setIsLoading(true);

    try {
      const requestMessages = await this.buildChapterSummaryRequestMessages();

      this.setStatus("Generating chapter summary...");
      const summary = await d.GrokChatAPI().postChat(requestMessages);

      return summary;
    } catch (e) {
      d.ErrorService().log("Failed to generate chapter summary", e);
      throw e;
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  getStoryPrompt = (chatSettings: ChatSettings) => {
    if (chatSettings?.promptType == "Manual" && chatSettings?.customPrompt)
      return chatSettings.customPrompt;

    return FirstPersonCharacterPrompt;
  };

  buildGenerationRequestMessages = async (
    includeResponsePrompt: boolean = true
  ): Promise<LLMMessage[]> => {
    const chatSettings = await d.ChatSettingsService(this.chatId).get();

    const storyPrompt = this.getStoryPrompt(chatSettings);
    const chatMessages = d.LLMChatProjection(this.chatId).GetMessages();

    this.setStatus("Planning...");
    const planningNotesService = d.PlanningNotesService(this.chatId);
    await planningNotesService.generateUpdatedPlanningNotes(chatMessages);
    const notes = planningNotesService.getPlanningNotes();

    this.setStatus("Fetching memories...");
    const memories = await d.MemoriesService(this.chatId).get();

    const messages: LLMMessage[] = [];
    messages.push(toSystemMessage(storyPrompt));
    messages.push(...this.buildStoryMessages(chatSettings));
    messages.push(...chatMessages);
    messages.push(...this.buildNoteMessages(notes));
    messages.push(...this.buildMemoryMessages(memories));
    if (includeResponsePrompt) messages.push(toSystemMessage(RESPONSE_PROMPT));

    return messages;
  };

  buildNoteMessages = (updatedPlanningNotes: Note[]) => {
    return updatedPlanningNotes.map((note) =>
      toSystemMessage(`${note.name}\n${note.content ?? ""}`)
    );
  };

  buildMemoryMessages = (memories: Memory[]) => {
    if (memories.length === 0) return [];

    const memoryContent = memories
      .map((memory) => memory.content)
      .filter((content) => content.trim().length > 0)
      .join("\r\n");

    if (memoryContent.trim().length === 0) return [];

    return [toSystemMessage(`# Memories\r\n${memoryContent}`)];
  };

  buildStoryMessages = (chatSettings: ChatSettings) => {
    if (!chatSettings?.story?.trim()) return [];
    return [toSystemMessage(`# Story\r\n${chatSettings.story}`)];
  };

  buildRegenerationRequestMessages = async (
    originalContent: string,
    feedback?: string
  ): Promise<LLMMessage[]> => {
    const temporaryFeedbackMessage = this.buildTemporaryFeedbackMessage(
      originalContent,
      feedback
    );

    const messages = await this.buildGenerationRequestMessages(false);

    if (temporaryFeedbackMessage)
      messages.push(toSystemMessage(temporaryFeedbackMessage));

    return messages;
  };

  buildChapterSummaryRequestMessages = async (): Promise<LLMMessage[]> => {
    const chatMessages = d.LLMChatProjection(this.chatId).GetMessages();

    const summaryPrompt = this.buildChapterSummaryPrompt();

    return [...chatMessages, toSystemMessage(summaryPrompt)];
  };

  private buildChapterSummaryPrompt(): string {
    return `Review the conversation above and generate a brief summary of the current chapter. Focus on the key events, character developments, and plot progression. Keep the summary to about a paragraph. Provide your summary directly without a preamble.`;
  }

  private buildTemporaryFeedbackMessage(
    originalContent: string | undefined,
    feedback?: string
  ) {
    if (feedback === undefined) return undefined;

    let temporaryFeedbackMessage: string | undefined;
    if (feedback && feedback.trim()) {
      temporaryFeedbackMessage = `The previous response was: "${originalContent}"\n\nPlease regenerate with this feedback: ${feedback}`;
    }
    return temporaryFeedbackMessage;
  }
}
