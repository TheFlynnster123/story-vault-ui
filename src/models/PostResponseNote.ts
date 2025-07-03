import type { Message } from "../Chat/ChatMessage";
import type { NoteAPI } from "../clients/NoteAPI";
import type { GrokChatAPI } from "../clients/GrokChatAPI";

/**
 * Abstract base class for notes that are generated and saved AFTER a response is created.
 * These notes are updated based on the conversation flow and stored for future use.
 */
export abstract class PostResponseNote {
  protected noteAPI: NoteAPI;
  protected chatId: string;
  protected content: string = "";

  constructor(noteAPI: NoteAPI, chatId: string, initialContent: string = "") {
    this.noteAPI = noteAPI;
    this.chatId = chatId;
    this.content = initialContent;
  }

  /**
   * Get the unique identifier for this note type
   */
  abstract getNoteName(): string;

  /**
   * Get the prompt template for generating new content
   */
  abstract getGenerationPrompt(): string;

  /**
   * Get the prompt template for updating existing content
   */
  abstract getUpdatePrompt(): string;

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
   * Check if the note has existing content
   */
  hasContent(): boolean {
    return this.content.trim().length > 0;
  }

  /**
   * Generate new note content based on the conversation
   */
  async generate(
    messageList: Message[],
    grokClient: GrokChatAPI
  ): Promise<void> {
    try {
      const prompt = this.hasContent()
        ? `${this.getUpdatePrompt()}\n\n${this.content}`
        : this.getGenerationPrompt();

      const promptMessage: Message = {
        id: `${this.getNoteName()}-prompt-${Date.now()}`,
        role: "system",
        content: prompt,
      };

      const messagesWithPrompt = [...messageList, promptMessage];
      const newContent = await grokClient.postChat(messagesWithPrompt, "low");

      this.content = newContent;
    } catch (error) {
      console.error(`Failed to generate ${this.getNoteName()} note:`, error);
      throw error;
    }
  }

  /**
   * Save the note content to storage
   */
  async save(): Promise<void> {
    try {
      await this.noteAPI.saveNote(
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
  async generateAndSave(
    messageList: Message[],
    grokClient: GrokChatAPI
  ): Promise<void> {
    await this.generate(messageList, grokClient);
    await this.save();
  }
}
