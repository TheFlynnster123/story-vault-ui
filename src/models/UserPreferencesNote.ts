import { PostResponseNote } from "./PostResponseNote";

/**
 * Concrete implementation for managing user preferences notes.
 * This note tracks the user's story preferences, engagement patterns, and implicit choices.
 */
export class UserPreferencesNote extends PostResponseNote {
  getNoteName(): string {
    return "user-preferences";
  }

  getGenerationPrompt(): string {
    return "Generate a bulleted list analyzing the user's preferences. What story elements is the user engaging with? Do they have any implicit or explicit preferences? Afterwards ensure only a bulleted list is present in the response";
  }

  getUpdatePrompt(): string {
    return "Update this bulleted list analyzing the user's preferences. What story elements is the user engaging with? Do they have any implicit or explicit preferences? Keep list items brief but descriptive. Avoid deleting unique items. Avoid repeating details, and afterwards ensure only a bulleted list is present in the response:";
  }
}
