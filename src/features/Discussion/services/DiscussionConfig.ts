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
   *
   * When a string is returned, the result is treated as a preview that requires
   * user approval before being applied. The DiscussionService will store the
   * preview and expose it via `getPendingResult()`.
   */
  generateFromFeedback: (feedback: string) => Promise<string | void>;

  /**
   * Optional prompt used to auto-generate the first assistant message
   * when the discussion starts. If undefined, no initial message is generated.
   */
  buildInitialPrompt?: () => string | undefined;

  /**
   * Optional — applies a previously generated preview result.
   * Only needed when `generateFromFeedback` returns a preview string.
   */
  applyGenerated?: (preview: string) => Promise<void>;
}
