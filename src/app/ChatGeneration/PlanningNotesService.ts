import type { LLMMessage } from "../../cqrs/LLMChatProjection";
import type { ChatSettings, Note } from "../../models";
import { toSystemMessage } from "../../utils/messageUtils";
import { d } from "../Dependencies/Dependencies";

const PLANNING_NOTES_BLOB_NAME = "planning-notes";

export const getPlanningNotesQueryKey = (chatId: string) => [
  "planning-notes",
  chatId,
];

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
      this.PlanningNotes = await this.fetchPlanningNotes();
      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public fetchPlanningNotes = async (): Promise<Note[]> => {
    return (await d.QueryClient().ensureQueryData({
      queryKey: getPlanningNotesQueryKey(this.chatId),
      queryFn: async () => await this.fetchPlanningNotesFromBlob(),
    })) as Note[];
  };

  private fetchPlanningNotesFromBlob = async (): Promise<Note[]> => {
    try {
      const blobContent = await d
        .BlobAPI()
        .getBlob(this.chatId, PLANNING_NOTES_BLOB_NAME);

      if (!blobContent) return [];

      return JSON.parse(blobContent) as Note[];
    } catch (e) {
      if (e instanceof Error && e.message.includes("Blob not found")) return [];

      d.ErrorService().log("Failed to fetch planning notes", e);
      return [];
    }
  };

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

  public updateNoteDefinition(
    noteId: string,
    field: keyof Note,
    value: string
  ): void {
    const note = this.PlanningNotes.find((n) => n.id === noteId);
    if (note) {
      (note[field] as string) = value;
      this.notifySubscribers();
    }
  }

  public addNote(note: Note): void {
    this.PlanningNotes.push(note);
    this.notifySubscribers();
  }

  public removeNote(noteId: string): void {
    this.PlanningNotes = this.PlanningNotes.filter((n) => n.id !== noteId);
    this.notifySubscribers();
  }

  public setAllNotes(notes: Note[]): void {
    this.PlanningNotes = notes;
    this.notifySubscribers();
  }

  public async savePlanningNotes(notes?: Note[]): Promise<void> {
    this.IsLoading = true;
    try {
      const notesToSave = notes ?? this.PlanningNotes;
      const blobContent = JSON.stringify(notesToSave);
      await d
        .BlobAPI()
        .saveBlob(this.chatId, PLANNING_NOTES_BLOB_NAME, blobContent);

      if (notes) {
        this.PlanningNotes = notes;
      }

      d.QueryClient().setQueryData(
        getPlanningNotesQueryKey(this.chatId),
        notesToSave
      );

      this.notifySubscribers();
    } finally {
      this.IsLoading = false;
    }
  }

  public async refreshFromDatabase(): Promise<void> {
    await this.loadPlanningNotes();
  }

  public generateUpdatedPlanningNotes = async (
    chatMessages: LLMMessage[]
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
    chatMessages: LLMMessage[]
  ) => {
    const chatSettings = await d.ChatSettingsService(this.chatId).get();

    const promptMessages: LLMMessage[] = [
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
