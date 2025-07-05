import { Note } from "./Note";
import type { NoteAPI } from "../clients/NoteAPI";

export interface ChatSettings {
  chatTitle: string;
  context: string;
}

export class ChatSettingsNote extends Note {
  private noteAPI: NoteAPI;

  constructor(chatId: string, noteAPI: NoteAPI, settings?: ChatSettings) {
    const content = settings ? JSON.stringify(settings) : "";
    super(chatId, "chat-settings", content);
    this.noteAPI = noteAPI;
  }

  /**
   * Get the chat settings as a parsed object
   */
  getSettings(): ChatSettings {
    if (!this.content) {
      return { chatTitle: "", context: "" };
    }

    try {
      return JSON.parse(this.content) as ChatSettings;
    } catch (error) {
      console.error("Failed to parse chat settings:", error);
      return { chatTitle: "", context: "" };
    }
  }

  /**
   * Set the chat settings
   */
  setSettings(settings: ChatSettings): void {
    this.content = JSON.stringify(settings);
  }

  /**
   * Get the story title
   */
  getChatTitle(): string {
    return this.getSettings().chatTitle;
  }

  /**
   * Get the context
   */
  getContext(): string {
    return this.getSettings().context;
  }

  /**
   * Set the story title
   */
  setChatTitle(title: string): void {
    const settings = this.getSettings();
    settings.chatTitle = title;
    this.setSettings(settings);
  }

  /**
   * Set the context
   */
  setContext(context: string): void {
    const settings = this.getSettings();
    settings.context = context;
    this.setSettings(settings);
  }

  /**
   * Check if settings have been configured
   */
  hasSettings(): boolean {
    const settings = this.getSettings();
    return (
      settings.chatTitle.trim().length > 0 || settings.context.trim().length > 0
    );
  }

  /**
   * Save the settings to the API
   */
  async save(): Promise<void> {
    await this.noteAPI.saveNote(this.chatId, this.noteName, this.content);
  }

  /**
   * Load the settings from the API
   */
  async load(): Promise<void> {
    const content = await this.noteAPI.getNote(this.chatId, this.noteName);
    if (content) {
      this.content = content;
    }
  }

  /**
   * Delete the settings from the API
   */
  async delete(): Promise<void> {
    await this.noteAPI.deleteNote(this.chatId, this.noteName);
    this.content = "";
  }
}
