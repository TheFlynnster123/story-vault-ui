import type { Message } from "../Chat/ChatMessage";
import type { NoteAPI } from "../clients/NoteAPI";

/**
 * Abstract base class for notes that are loaded and used BEFORE generating a response.
 * These notes provide context to the AI model during response generation.
 */
export abstract class PreResponseNote {
  protected noteAPI: NoteAPI;
  protected chatId: string;
  protected content: string = "";
  protected loaded: boolean = false;

  constructor(noteAPI: NoteAPI, chatId: string) {
    this.noteAPI = noteAPI;
    this.chatId = chatId;
  }

  /**
   * Get the unique identifier for this note type
   */
  abstract getNoteName(): string;

  /**
   * Get the label used when appending to chat context
   */
  abstract getContextLabel(): string;

  /**
   * Load the note content from storage
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const noteContent = await this.noteAPI.getNote(
        this.chatId,
        this.getNoteName()
      );
      this.content = noteContent || "";
      this.loaded = true;
    } catch (error) {
      console.error(`Failed to load ${this.getNoteName()} note:`, error);
      this.content = "";
      this.loaded = true;
    }
  }

  /**
   * Get the current content of the note
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Set the content of the note
   */
  setContent(content: string): void {
    this.content = content;
  }

  /**
   * Check if the note has content
   */
  hasContent(): boolean {
    return this.content.trim().length > 0;
  }

  /**
   * Create a system message for appending to chat context
   */
  getContextMessage(): Message | null {
    if (!this.hasContent()) return null;

    return {
      id: `${this.getNoteName()}-context-${Date.now()}`,
      role: "system",
      content: `${this.getContextLabel()}:\n${this.content}`,
    };
  }

  /**
   * Append this note's content to the message list if it has content
   */
  appendToContext(messageList: Message[]): Message[] {
    const contextMessage = this.getContextMessage();
    if (contextMessage) {
      return [...messageList, contextMessage];
    }
    return messageList;
  }
}
