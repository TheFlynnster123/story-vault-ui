import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";

/**
 * Configuration that defines how a specific discussion variant behaves.
 * Each variant (Plan, Chapter, Book, Story) provides its own config.
 */
export interface DiscussionConfig {
  /** Build the system prompt for the ephemeral conversation */
  buildSystemPrompt: () => string;

  /** Get the chat message context for the LLM (story log) */
  getChatMessages: () => LLMMessage[];

  /** Get the default model for this discussion (if any) */
  getDefaultModel: () => string | undefined;

  /**
   * Execute the "generate" action using the conversation as feedback.
   * e.g. regenerate plan, update chapter summary, update book summary, regenerate story.
   */
  generateFromFeedback: (feedback: string) => Promise<void>;
}
