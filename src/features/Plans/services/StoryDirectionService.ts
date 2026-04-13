import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import type { Plan } from "./Plan";

export interface DirectionMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Manages an ephemeral conversation about story direction for a specific plan.
 * The conversation is temporary (not persisted as CQRS events) and is used
 * to gather user feedback before regenerating the plan.
 */
export class StoryDirectionService {
  private chatId: string;
  private planId: string;
  private messages: DirectionMessage[] = [];
  private generating: boolean = false;
  private subscribers = new Set<() => void>();

  constructor(chatId: string, planId: string) {
    this.chatId = chatId;
    this.planId = planId;
  }

  public subscribe = (callback: () => void): (() => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  private notifySubscribers = (): void => {
    this.subscribers.forEach((callback) => callback());
  };

  public getMessages = (): ReadonlyArray<DirectionMessage> => this.messages;

  public isGenerating = (): boolean => this.generating;

  /**
   * Sends a user message and gets an LLM response in the context of the
   * story's current state and plan.
   */
  public sendMessage = async (userMessage: string): Promise<void> => {
    if (!userMessage.trim() || this.generating) return;

    const plan = this.findPlan();
    if (!plan) return;

    this.messages = [...this.messages, { role: "user", content: userMessage }];
    this.generating = true;
    this.notifySubscribers();

    try {
      const promptMessages = this.buildConversationPrompt(plan);
      const response = await d
        .OpenRouterChatAPI()
        .postChat(promptMessages, plan.model || undefined);

      this.messages = [
        ...this.messages,
        { role: "assistant", content: response },
      ];
    } catch (e) {
      d.ErrorService().log("Failed to get story direction response", e);
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
   * Regenerates the plan using the entire direction conversation as feedback.
   * Calls PlanGenerationService.regeneratePlanFromMessage with the conversation
   * formatted as feedback text.
   */
  public generateUpdatedPlan = async (): Promise<void> => {
    if (this.messages.length === 0) return;

    const plan = this.findPlan();
    if (!plan) return;

    this.generating = true;
    this.notifySubscribers();

    try {
      const conversationFeedback = this.formatConversationAsFeedback();
      const priorContent = this.getLatestPlanContent();

      await d
        .PlanGenerationService(this.chatId)
        .regeneratePlanFromMessage(
          this.planId,
          priorContent || undefined,
          conversationFeedback,
        );
    } finally {
      this.generating = false;
      this.notifySubscribers();
    }
  };

  private findPlan = (): Plan | undefined =>
    d
      .PlanService(this.chatId)
      .getPlans()
      .find((p) => p.id === this.planId);

  private getLatestPlanContent = (): string | undefined => {
    const messages = d.LLMChatProjection(this.chatId).GetMessages();
    const planMessages = messages.filter(
      (m) => m.id?.startsWith("plan-"),
    );

    // Find the latest visible plan message for this plan definition
    // by checking from the end of the visible messages
    for (let i = planMessages.length - 1; i >= 0; i--) {
      const msg = planMessages[i];
      if (msg.content?.includes(`[Plan: `)) {
        // Extract raw content from formatted plan message
        const match = msg.content.match(
          /\[Plan: [^\]]+\]\n([\s\S]*)\n\[End of Plan\]/,
        );
        if (match) return match[1];
        return msg.content;
      }
    }

    return undefined;
  };

  /**
   * Builds the full prompt for the direction conversation, including:
   * 1. The consolidated story log (chat messages)
   * 2. The plan prompt context
   * 3. The current generated plan
   * 4. The ongoing direction conversation
   */
  private buildConversationPrompt = (plan: Plan): LLMMessage[] => {
    const chatMessages = this.getChatMessages(plan);
    const latestPlan = this.getLatestPlanContent();

    const systemPrompt = buildDirectionSystemPrompt(
      plan,
      latestPlan,
    );

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

  private getChatMessages = (plan: Plan): LLMMessage[] => {
    if (plan.hideOtherPlans) {
      return d.LLMChatProjection(this.chatId).GetMessagesExcludingAllPlans();
    }
    return d
      .LLMChatProjection(this.chatId)
      .GetMessagesExcludingPlan(this.planId);
  };

  private formatConversationAsFeedback = (): string =>
    this.messages
      .map((m) => {
        const label = m.role === "user" ? "User" : "Assistant";
        return `${label}: ${m.content}`;
      })
      .join("\n\n");
}

const buildDirectionSystemPrompt = (
  plan: Plan,
  latestPlanContent: string | undefined,
): string => {
  const lines = [
    `# Story Direction Discussion — ${plan.name}`,
    ``,
    `You are helping the user discuss and refine the direction of their story.`,
    `Consider the full chat history above for context.`,
  ];

  if (latestPlanContent) {
    lines.push(
      ``,
      `This was the most recently generated story plan:`,
      `---`,
      latestPlanContent,
      `---`,
    );
  }

  lines.push(
    ``,
    `The user would like to discuss what direction the story should take.`,
    `Engage in a helpful, creative conversation about story possibilities.`,
    `Suggest ideas, ask clarifying questions, and help them refine their vision.`,
    `Keep responses concise and focused on actionable story directions.`,
  );

  return lines.join("\n");
};
