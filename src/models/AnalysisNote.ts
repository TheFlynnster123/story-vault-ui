import { PostResponseNote } from "./PostResponseNote";
import type { BlobAPI } from "../clients/BlobAPI";
import type { GrokChatAPI } from "../clients/GrokChatAPI";
import { CHAT_FLOW_V2_TEMPLATES } from "../constants/chatFlowV2";

/**
 * PostResponseNote implementation for analysis notes.
 * Generates analysis and direction for the next message after the conversation.
 */
export class AnalysisNote extends PostResponseNote {
  constructor(blobAPI: BlobAPI, chatId: string, grokClient: GrokChatAPI) {
    super(blobAPI, chatId, grokClient);
  }

  getNoteName(): string {
    return "analysis-notes";
  }

  getContextLabel(): string {
    return "Analysis Notes";
  }

  getGenerationPrompt(): string {
    return CHAT_FLOW_V2_TEMPLATES.ANALYSIS_PROMPT;
  }

  getUpdatePrompt(): string {
    return (
      "Update the analysis notes based on the latest conversation. Consider how the story has progressed and what new directions are now possible or necessary. " +
      "Focus on maintaining narrative coherence while identifying opportunities for compelling story development."
    );
  }
}
