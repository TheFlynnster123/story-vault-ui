import type { Message } from "../Chat/ChatMessage";
import type { BlobAPI } from "../clients/BlobAPI";
import type { GrokChatAPI } from "../clients/GrokChatAPI";
import { ResponseNote } from "./ResponseNote";

/**
 * Abstract base class for notes that are generated and saved AFTER a response is created.
 * These notes are updated based on the conversation flow and stored for future use.
 */
export abstract class PostResponseNote extends ResponseNote {
  protected blobAPI: BlobAPI;
  protected chatId: string;

  constructor(
    blobAPI: BlobAPI,
    chatId: string,
    grokClient: GrokChatAPI,
    initialContent: string = ""
  ) {
    super(grokClient, initialContent);
    this.blobAPI = blobAPI;
    this.chatId = chatId;
  }

  /**
   * Get the prompt template for updating existing content
   */
  abstract getUpdatePrompt(): string;

  /**
   * Load existing note content from storage
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      const existingContent = await this.blobAPI.getNote(
        this.chatId,
        this.getNoteName()
      );
      if (existingContent) {
        this.content = existingContent;
      }
      this.loaded = true;
    } catch (error) {
      console.error(`Failed to load ${this.getNoteName()} note:`, error);
      this.loaded = true; // Still mark as loaded to prevent retries
    }
  }

  /**
   * Save the note content to storage
   */
  async save(): Promise<void> {
    try {
      await this.blobAPI.saveNote(
        this.chatId,
        this.getNoteName(),
        this.content
      );
    } catch (error) {
      console.error(`Failed to save ${this.getNoteName()} note:`, error);
      throw error;
    }
  }

  /**
   * Generate and save the note in one operation
   */
  async generateAndSave(messageList: Message[]): Promise<void> {
    await this.generate(messageList);
    await this.save();
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
}
