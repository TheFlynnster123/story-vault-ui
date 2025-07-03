import { PreResponseNote } from "./PreResponseNote";

/**
 * PreResponseNote implementation for story summary.
 * Loads and provides story context before generating responses.
 */
export class StorySummaryPreNote extends PreResponseNote {
  getNoteName(): string {
    return "story-summary";
  }

  getContextLabel(): string {
    return "Story Summary";
  }
}
