import { PreResponseNote } from "./PreResponseNote";
import type { GrokChatAPI } from "../clients/GrokChatAPI";

/**
 * PreResponseNote implementation for planning notes.
 * Generates planning content before creating the final response.
 */
export class PlanningPreResponseNote extends PreResponseNote {
  constructor(grokClient: GrokChatAPI) {
    super(grokClient);
  }

  getNoteName(): string {
    return "planning-notes";
  }

  getContextLabel(): string {
    return "Planning Notes";
  }

  getGenerationPrompt(): string {
    return (
      "Planning Notes - Respond with ONLY the following template filled out. Do not provide a draft message yet:\n" +
      "Where are we at in the story flow? Should we continue engaging in dialogue, should we expand and let develop the current plot point, does another plot point need introducing?"
    );
  }
}
