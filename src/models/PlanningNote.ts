import { PreResponseNote } from "./PreResponseNote";
import type { GrokChatAPI } from "../clients/GrokChatAPI";
import { CHAT_FLOW_V2_TEMPLATES } from "../constants/chatFlowV2";

/**
 * PreResponseNote implementation for planning notes.
 * Generates planning content before creating the final response.
 */
export class PlanningNote extends PreResponseNote {
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
    return CHAT_FLOW_V2_TEMPLATES.PLANNING_PROMPT;
  }
}
