import type { ChatSettings, Note } from "../../models";
import type { Memory } from "../../models/Memory";
import type { Message } from "../../pages/Chat/ChatMessage";
import { FirstPersonCharacterPrompt } from "../../templates/FirstPersonCharacterTemplate";
import { toSystemMessage } from "../../utils/messageUtils";
import { d } from "../Dependencies/Dependencies";

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

    const chatSettings = await d.ChatSettingsService(chatId).get();

    this.setIsLoading(true);

    this.setStatus("Fetching memories...");
    const memories = await d.MemoriesService(chatId).get();

    try {
      const storyPrompt = this.getStoryPrompt(chatSettings);
      const chatMessages = d.ChatCache(chatId).getMessagesForLLM();

      this.setStatus("Planning...");
      const updatedPlanningNotes = await d
        .PlanningNotesService(chatId)
        .generateUpdatedPlanningNotes(chatMessages);

      const requestMessages = this.buildRequestMessages(
        chatSettings,
        storyPrompt,
        chatMessages,
        updatedPlanningNotes,
        memories
      );

      this.setStatus("Generating response...");
      const response = await d.GrokChatAPI().postChat(requestMessages);

      this.setStatus("Saving...");
      await d.ChatCache(chatId).addMessage(toSystemMessage(response));

      return response;
    } catch (e) {
      d.ErrorService().log("Failed to generate chat response", e as Error);
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

  buildRequestMessages = (
    chatSettings: ChatSettings,
    storyPrompt: string,
    chatMessages: Message[],
    notes: Note[],
    memories: Memory[]
  ): Message[] => {
    return [
      toSystemMessage(storyPrompt),
      ...this.buildStoryMessages(chatSettings),
      ...chatMessages,
      ...this.buildNoteMessages(notes),
      ...this.buildMemoryMessages(memories),
      toSystemMessage(RESPONSE_PROMPT),
    ];
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
      .join("\r\n-");

    if (memoryContent.trim().length === 0) return [];

    return [toSystemMessage(`# Memories\r\n${memoryContent}`)];
  };

  buildStoryMessages = (chatSettings: ChatSettings) => {
    if (!chatSettings?.story?.trim()) return [];
    return [toSystemMessage(`# Story\r\n${chatSettings.story}`)];
  };
}
