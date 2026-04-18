import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import type { DiscussionConfig } from "./DiscussionConfig";
import type { DiscussionMessage } from "./DiscussionMessage";

/**
 * Manages an ephemeral conversation for discussing and refining content.
 * The conversation is temporary (not persisted as CQRS events) and is used
 * to gather user feedback before regenerating content.
 *
 * This is the generic base — each variant (Plan, Chapter, Book, Story)
 * supplies a DiscussionConfig that controls prompt building and the
 * generate action.
 *
 * When a config's `generateFromFeedback` returns a string, the result is
 * treated as a preview requiring user approval. Call `applyPendingResult()`
 * to persist the preview.
 */
export class DiscussionService {
  private config: DiscussionConfig;
  private messages: DiscussionMessage[] = [];
  private generating: boolean = false;
  private pendingResult: string | null = null;
  private subscribers = new Set<() => void>();

  constructor(config: DiscussionConfig) {
    this.config = config;
  }

  public subscribe = (callback: () => void): (() => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  private notifySubscribers = (): void => {
    this.subscribers.forEach((callback) => callback());
  };

  public getMessages = (): ReadonlyArray<DiscussionMessage> => this.messages;

  public isGenerating = (): boolean => this.generating;

  public getPendingResult = (): string | null => this.pendingResult;

  public getDefaultModel = (): string | undefined =>
    this.config.getDefaultModel();

  /**
   * Sends a user message and gets an LLM response in context.
   * Clears any pending result since the conversation has changed.
   * @param modelOverride - When provided, overrides the default model for this call.
   */
  public sendMessage = async (
    userMessage: string,
    modelOverride?: string,
  ): Promise<void> => {
    if (!userMessage.trim() || this.generating) return;

    this.pendingResult = null;
    this.messages = [...this.messages, { role: "user", content: userMessage }];
    this.generating = true;
    this.notifySubscribers();

    try {
      const promptMessages = this.buildConversationPrompt();
      const model = modelOverride || this.config.getDefaultModel();
      const response = await d
        .OpenRouterChatAPI()
        .postChat(promptMessages, model);

      this.messages = [
        ...this.messages,
        { role: "assistant", content: response },
      ];
    } catch (e) {
      d.ErrorService().log("Failed to get discussion response", e);
      this.messages = [
        ...this.messages,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ];
    } finally {
      this.generating = false;
      this.notifySubscribers();
    }
  };

  /**
   * Triggers the variant-specific generate action using the conversation
   * formatted as feedback text.
   *
   * When the config returns a preview string, it is stored as a pending
   * result and shown as an assistant message. Call `applyPendingResult()`
   * to persist the preview.
   */
  public generateFromFeedback = async (): Promise<void> => {
    if (this.messages.length === 0) return;

    this.generating = true;
    this.notifySubscribers();

    try {
      const feedback = this.formatConversationAsFeedback();
      const result = await this.config.generateFromFeedback(feedback);

      if (typeof result === "string") {
        this.pendingResult = result;
        this.messages = [
          ...this.messages,
          {
            role: "assistant",
            content: `**Generated Summary:**\n\n${result}`,
          },
        ];
      }
    } finally {
      this.generating = false;
      this.notifySubscribers();
    }
  };

  /**
   * Applies the pending generated result via the config's `applyGenerated`.
   * Returns true if the result was applied, false if there was nothing to apply.
   */
  public applyPendingResult = async (): Promise<boolean> => {
    if (!this.pendingResult || !this.config.applyGenerated) return false;

    this.generating = true;
    this.notifySubscribers();

    try {
      await this.config.applyGenerated(this.pendingResult);
      this.pendingResult = null;
      return true;
    } finally {
      this.generating = false;
      this.notifySubscribers();
    }
  };

  /**
   * Returns true when the config supports the approval flow
   * (i.e. generateFromFeedback returns a preview requiring approval).
   */
  public requiresApproval = (): boolean => !!this.config.applyGenerated;

  /**
   * Generates the first assistant message when a discussion starts.
   * Uses the config's buildInitialPrompt to get a hidden user instruction
   * that the LLM responds to. Only the response is shown in the UI.
   */
  public generateInitialMessage = async (
    modelOverride?: string,
  ): Promise<void> => {
    if (this.messages.length > 0 || this.generating) return;

    const initialPrompt = this.config.buildInitialPrompt?.();
    if (!initialPrompt) return;

    this.generating = true;
    this.notifySubscribers();

    try {
      const promptMessages = this.buildConversationPrompt();
      promptMessages.push({ role: "user", content: initialPrompt });

      const model = modelOverride || this.config.getDefaultModel();
      const response = await d
        .OpenRouterChatAPI()
        .postChat(promptMessages, model);

      this.messages = [{ role: "assistant", content: response }];
    } catch (e) {
      d.ErrorService().log("Failed to generate initial message", e);
      this.messages = [
        {
          role: "assistant",
          content:
            "Sorry, I couldn't generate the initial summary. Please send a message to start.",
        },
      ];
    } finally {
      this.generating = false;
      this.notifySubscribers();
    }
  };

  /**
   * Adds optional final user feedback, then triggers the generate action.
   * This lets users provide last-minute input and generate in one step,
   * avoiding the send → wait → generate cycle.
   */
  public sendFinalFeedbackAndGenerate = async (
    userMessage?: string,
  ): Promise<void> => {
    if (this.generating) return;

    if (userMessage?.trim()) {
      this.pendingResult = null;
      this.messages = [
        ...this.messages,
        { role: "user", content: userMessage.trim() },
      ];
      this.notifySubscribers();
    }

    return this.generateFromFeedback();
  };

  private buildConversationPrompt = (): LLMMessage[] => {
    const chatMessages = this.config.getChatMessages();
    const systemPrompt = this.config.buildSystemPrompt();

    const conversationMessages: LLMMessage[] = this.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    return [
      ...chatMessages,
      toSystemMessage(systemPrompt),
      ...conversationMessages,
    ];
  };

  private formatConversationAsFeedback = (): string =>
    this.messages
      .map((m) => {
        const label = m.role === "user" ? "User" : "Assistant";
        return `${label}: ${m.content}`;
      })
      .join("\n\n");
}
