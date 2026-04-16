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
 */
export class DiscussionService {
  private config: DiscussionConfig;
  private messages: DiscussionMessage[] = [];
  private generating: boolean = false;
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

  public getDefaultModel = (): string | undefined =>
    this.config.getDefaultModel();

  /**
   * Sends a user message and gets an LLM response in context.
   * @param modelOverride - When provided, overrides the default model for this call.
   */
  public sendMessage = async (
    userMessage: string,
    modelOverride?: string,
  ): Promise<void> => {
    if (!userMessage.trim() || this.generating) return;

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
   */
  public generateFromFeedback = async (): Promise<void> => {
    if (this.messages.length === 0) return;

    this.generating = true;
    this.notifySubscribers();

    try {
      const feedback = this.formatConversationAsFeedback();
      await this.config.generateFromFeedback(feedback);
    } finally {
      this.generating = false;
      this.notifySubscribers();
    }
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
