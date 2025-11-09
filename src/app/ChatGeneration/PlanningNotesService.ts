import type { ChatSettings, Note } from "../../models";
import type { Message } from "../../pages/Chat/ChatMessage";
import { toSystemMessage } from "../../utils/messageUtils";
import { d } from "../Dependencies/Dependencies";

// Singleton instances
const planningNotesCacheInstances = new Map<string, PlanningNotesService>();

export const getPlanningNotesCacheInstance = (
  chatId: string | null
): PlanningNotesService | null => {
  if (!chatId) return null;

  if (!planningNotesCacheInstances.has(chatId))
    planningNotesCacheInstances.set(chatId, new PlanningNotesService(chatId));

  return planningNotesCacheInstances.get(chatId)!;
};

export class PlanningNotesService {
  public PlanningNotes: Note[] = [];
  public IsLoading: boolean = false;

  private chatId: string;
  private initialized: boolean = false;
  private subscribers = new Set<() => void>();

  constructor(chatId: string) {
    this.chatId = chatId;
    this.initializeNotesIfNeeded();
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  private async initializeNotesIfNeeded(): Promise<void> {
    if (!this.initialized) {
      await this.loadPlanningNotes();
      this.initialized = true;
    }
  }

  private async loadPlanningNotes(): Promise<void> {
    this.IsLoading = true;
    try {
      this.PlanningNotes = await d.NotesService(this.chatId).getPlanningNotes();
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public getPlanningNotes(): Note[] {
    return this.PlanningNotes;
  }

  public updateNoteContent(noteId: string, content: string): void {
    const note = this.PlanningNotes.find((n) => n.id === noteId);
    if (note) {
      note.content = content;
      this.notifySubscribers();
    }
  }

  public async savePlanningNotes(): Promise<void> {
    this.IsLoading = true;
    try {
      const allNotes = await d.NotesService(this.chatId).getAllNotes();
      const nonPlanningNotes = allNotes.filter((n) => n.type !== "planning");
      const updatedNotes = [...nonPlanningNotes, ...this.PlanningNotes];

      await d.NotesService(this.chatId).save(updatedNotes);
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public async refreshFromDatabase(): Promise<void> {
    await this.loadPlanningNotes();
  }

  public generateUpdatedPlanningNotes = async (
    chatMessages: Message[]
  ): Promise<void> => {
    this.IsLoading = true;
    try {
      const processPromises = this.PlanningNotes.map(
        async (note) =>
          await this.generatePlanningNoteContent(note, chatMessages)
      );

      this.PlanningNotes = await Promise.all(processPromises);
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  };

  private generatePlanningNoteContent = async (
    note: Note,
    chatMessages: Message[]
  ) => {
    const chatSettings = await d.ChatSettingsService(this.chatId).get();

    const promptMessages: Message[] = [
      ...this.buildStoryMessages(chatSettings),
      ...chatMessages,
      toSystemMessage(
        `#${note.name}\r\n
          ~ Consider the chat history above, and generate a note  note in Markdown without preamble or additional text ~
          ${note.prompt}
          \r\n
          =====
          \r\n`
      ),
    ];

    const response = await d.GrokChatAPI().postChat(promptMessages);

    return { ...note, content: response };
  };

  private buildStoryMessages = (chatSettings?: ChatSettings) => {
    if (!chatSettings?.story?.trim()) return [];
    return [toSystemMessage(`# Story\r\n${chatSettings.story}`)];
  };
}
