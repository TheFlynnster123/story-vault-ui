import { PostResponseNote } from "./PostResponseNote";

/**
 * Concrete implementation for managing story summary notes.
 * This note tracks the overall narrative progression and key plot points.
 */
export class StorySummaryNote extends PostResponseNote {
  getNoteName(): string {
    return "story-summary";
  }

  getGenerationPrompt(): string {
    return "Generate a bulleted list summarizing the story so far. Keep list items brief but descriptive, and afterwards ensure only a bulleted list is present in the response";
  }

  getUpdatePrompt(): string {
    return "Update this bulleted list summarizing the story so far. Keep list items brief but descriptive. Avoid deleting unique items. Avoid repeating details, and afterwards ensure only a bulleted list is present in the response:";
  }
}
