import { PreResponseNote } from "./PreResponseNote";
import type { GrokChatAPI } from "../clients/GrokChatAPI";
import { CHAT_FLOW_V2_TEMPLATES } from "../constants/chatFlowV2";

/**
 * PreResponseNote implementation for refinement notes.
 * Generates refinement feedback based on the most recent system message.
 */
export class RefinementNote extends PreResponseNote {
  constructor(grokClient: GrokChatAPI) {
    super(grokClient);
  }

  getNoteName(): string {
    return "refinement-notes";
  }

  getContextLabel(): string {
    return "Refinement Notes";
  }

  getGenerationPrompt(): string {
    return CHAT_FLOW_V2_TEMPLATES.REFINEMENT_PROMPT;
  }
}
