import { PostResponseNote } from "./PostResponseNote";
import type { NoteAPI } from "../clients/NoteAPI";
import type { GrokChatAPI } from "../clients/GrokChatAPI";

/**
 * Concrete implementation for managing story summary notes.
 * This note tracks the overall narrative progression and key plot points.
 */
export class StorySummaryNote extends PostResponseNote {
  constructor(
    noteAPI: NoteAPI,
    chatId: string,
    grokClient: GrokChatAPI,
    initialContent: string = ""
  ) {
    super(noteAPI, chatId, grokClient, initialContent);
  }

  getNoteName(): string {
    return "story-summary";
  }

  getContextLabel(): string {
    return "Story Summary";
  }

  getGenerationPrompt(): string {
    return "Generate a bulleted list summarizing the story so far. Keep list items descriptive, and afterwards ensure only a bulleted list is present in the response";
  }

  getUpdatePrompt(): string {
    return "Update this bulleted list summarizing the story so far. Keep list items descriptive. Ensure items in the list are unique and afterwards ensure only a bulleted list is present in the response:";
  }
}
