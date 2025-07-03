import { PostResponseNote } from "./PostResponseNote";
import type { NoteAPI } from "../clients/NoteAPI";
import type { GrokChatAPI } from "../clients/GrokChatAPI";

/**
 * Concrete implementation for managing user preferences notes.
 * This note tracks user preferences, writing style, and interaction patterns.
 */
export class UserPreferencesNote extends PostResponseNote {
  constructor(
    noteAPI: NoteAPI,
    chatId: string,
    grokClient: GrokChatAPI,
    initialContent: string = ""
  ) {
    super(noteAPI, chatId, grokClient, initialContent);
  }

  getNoteName(): string {
    return "user-preferences";
  }

  getContextLabel(): string {
    return "User Preferences";
  }

  getGenerationPrompt(): string {
    return "Generate a bulleted list of the user's preferences based on their interactions. Include writing style preferences, story elements they enjoy, and any specific requests they've made. Keep list items descriptive, and afterwards ensure only a bulleted list is present in the response";
  }

  getUpdatePrompt(): string {
    return "Update this bulleted list of user preferences based on recent interactions. Keep list items descriptive. Avoid deleting unique items. Add new preferences discovered, and afterwards ensure only a bulleted list is present in the response:";
  }
}
