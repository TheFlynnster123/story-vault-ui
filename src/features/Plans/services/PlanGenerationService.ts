import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import type { Plan } from "./Plan";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import {
  incrementMessageCounter,
  isAutoRefreshDisabled,
  isDueForRefresh,
  resetMessageCounter,
} from "./Plan";

export const getPlanGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new PlanGenerationService(chatId),
);

const consolidateMessagesToString = (messages: LLMMessage[]): string =>
  messages
    .map((msg) => {
      const roleLabel =
        msg.role === "user"
          ? "User"
          : msg.role === "assistant"
            ? "Assistant"
            : "System";
      return `${roleLabel}: ${msg.content}`;
    })
    .join("\n\n");

const buildPlanPrompt = (plan: Plan, feedback?: string): string => {
  const lines = [
    `# ${plan.name}`,
    ``,
    `Consider the full chat history above.`,
    `Generate a plan in Markdown. No preamble or additional commentary.`,
    ``,
    plan.prompt,
  ];

  if (feedback?.trim()) {
    lines.push(``, `User feedback on what to include or change:`, feedback);
  }

  return lines.join("\n");
};

const buildUpdatePlanPrompt = (
  plan: Plan,
  priorContent: string,
  feedback?: string,
): string => {
  const lines = [
    `# ${plan.name}`,
    ``,
    `Consider the full chat history above.`,
    `Here is the current version of this plan:`,
    `---`,
    priorContent,
    `---`,
    `Update the plan in Markdown. No preamble or additional commentary.`,
    ``,
    plan.prompt,
  ];

  if (feedback?.trim()) {
    lines.push(``, `User feedback on what to change:`, feedback);
  }

  return lines.join("\n");
};

const buildPromptMessages = (
  chatMessages: LLMMessage[],
  plan: Plan,
  feedback?: string,
): LLMMessage[] => {
  if (plan.consolidateMessageHistory) {
    const consolidatedHistory = consolidateMessagesToString(chatMessages);
    return [
      toSystemMessage(
        `Chat History:\n\n${consolidatedHistory}\n\n---\n\n${buildPlanPrompt(plan, feedback)}`,
      ),
    ];
  }
  return [...chatMessages, toSystemMessage(buildPlanPrompt(plan, feedback))];
};

const buildUpdatePromptMessages = (
  chatMessages: LLMMessage[],
  plan: Plan,
  priorContent: string,
  feedback?: string,
): LLMMessage[] => {
  if (plan.consolidateMessageHistory) {
    const consolidatedHistory = consolidateMessagesToString(chatMessages);
    return [
      toSystemMessage(
        `Chat History:\n\n${consolidatedHistory}\n\n---\n\n${buildUpdatePlanPrompt(plan, priorContent, feedback)}`,
      ),
    ];
  }
  return [
    ...chatMessages,
    toSystemMessage(buildUpdatePlanPrompt(plan, priorContent, feedback)),
  ];
};

const buildPlanSuggestionPrompt = (
  plan: Plan,
  suggestionPrompt: string,
  priorContent?: string,
): string => {
  const lines = [
    `# ${plan.name}`,
    ``,
    `Consider the full chat history above.`,
    `Suggest three candidate directions that could be used to generate this plan.`,
  ];

  if (priorContent?.trim()) {
    lines.push(
      ``,
      `Here is the current version of this plan:`,
      `---`,
      priorContent,
      `---`,
    );
  }

  lines.push(``, suggestionPrompt);

  return lines.join("\n");
};

const buildPlanSuggestionPromptMessages = (
  chatMessages: LLMMessage[],
  plan: Plan,
  suggestionPrompt: string,
  priorContent?: string,
): LLMMessage[] => {
  const prompt = buildPlanSuggestionPrompt(plan, suggestionPrompt, priorContent);

  if (plan.consolidateMessageHistory) {
    const consolidatedHistory = consolidateMessagesToString(chatMessages);
    return [
      toSystemMessage(`Chat History:\n\n${consolidatedHistory}\n\n---\n\n${prompt}`),
    ];
  }

  return [...chatMessages, toSystemMessage(prompt)];
};

interface PlanSuggestionResponse {
  suggestions: string[];
}

const PLAN_SUGGESTION_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "plan_suggestions",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["suggestions"],
      properties: {
        suggestions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "string",
            minLength: 1,
          },
        },
      },
    },
  },
};

const normalizePlanSuggestions = (
  response: PlanSuggestionResponse,
): string[] => {
  const uniqueSuggestions: string[] = [];

  for (const suggestion of response.suggestions ?? []) {
    const normalized = suggestion.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    if (uniqueSuggestions.includes(normalized)) continue;
    uniqueSuggestions.push(normalized);
    if (uniqueSuggestions.length === 3) break;
  }

  return uniqueSuggestions;
};

export class PlanGenerationService {
  private chatId: string;
  private generatingPlanIds = new Set<string>();
  private subscribers = new Set<() => void>();

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  // ---- Generation State ----

  public subscribe = (callback: () => void): (() => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  public isGenerating = (planId: string): boolean =>
    this.generatingPlanIds.has(planId);

  public getGeneratingPlanIds = (): ReadonlySet<string> =>
    this.generatingPlanIds;

  private trackGeneration = async (
    planId: string,
    operation: () => Promise<void>,
  ): Promise<void> => {
    this.generatingPlanIds.add(planId);
    this.notifySubscribers();
    try {
      await operation();
    } finally {
      this.generatingPlanIds.delete(planId);
      this.notifySubscribers();
    }
  };

  private notifySubscribers = (): void => {
    this.subscribers.forEach((callback) => callback());
  };

  // ---- Public API ----

  /**
   * Called when a new message is sent in the chat.
   * Increments the counter on every plan and saves immediately,
   * then fires off background regeneration for any plans that are now due.
   */
  public onMessageSent = (): void => {
    const planService = d.PlanService(this.chatId);
    const plans = planService.getPlans();
    if (plans.length === 0) return;

    const updatedPlans = plans.map((plan) =>
      isAutoRefreshDisabled(plan) ? plan : incrementMessageCounter(plan),
    );
    planService.savePlans(updatedPlans);

    const duePlans = updatedPlans.filter(isDueForRefresh);
    if (duePlans.length === 0) return;

    this.regenerateDuePlans(duePlans).catch((e) => {
      d.ErrorService().log("Failed to update plans", e);
    });
  };

  /**
   * Generates a plan on demand, regardless of refresh cadence.
   * Used by the "Generate Now" button on the Plan page.
   */
  public generatePlanNow = async (planId: string): Promise<void> => {
    const plan = this.findPlanDefinition(planId);
    if (!plan) return;

    await this.trackGeneration(planId, async () => {
      const chatMessages = this.getChatMessages(plan);
      await this.regeneratePlan(plan, chatMessages);
      this.resetCounter(planId);
    });
  };

  /**
   * Hides all plan messages for this definition from the chat timeline.
   * Used by the "Clear Plan" action on the Plans page.
   */
  public clearPlan = async (planId: string): Promise<void> => {
    await d.ChatService(this.chatId).ClearPlan(planId);
  };

  /**
   * Regenerates a plan from the chat timeline.
   * If priorContent is provided, sends an "update" prompt that includes
   * the prior plan and optional user feedback.
   * If no priorContent (hidden/deleted), generates from scratch.
   * Plan messages for this definition are excluded from the chat context
   * so the prior content isn't duplicated (it's in the prompt instead).
   */
  public regeneratePlanFromMessage = async (
    planDefinitionId: string,
    priorContent?: string,
    feedback?: string,
  ): Promise<void> => {
    const plan = this.findPlanDefinition(planDefinitionId);
    if (!plan) return;

    await this.trackGeneration(planDefinitionId, async () => {
      const chatMessages = plan.hideOtherPlans
        ? d.LLMChatProjection(this.chatId).GetMessagesExcludingAllPlans()
        : d
            .LLMChatProjection(this.chatId)
            .GetMessagesExcludingPlan(planDefinitionId);

      const promptMessages = priorContent
        ? buildUpdatePromptMessages(chatMessages, plan, priorContent, feedback)
        : buildPromptMessages(chatMessages, plan, feedback);

      const response = await d
        .OpenRouterChatAPI()
        .postChat(
          promptMessages,
          plan.model || undefined,
          "chat",
          "LLM",
          plan.modelRequestSettings,
        );
      const content = stripMarkdownCodeFence(response);
      await d
        .ChatService(this.chatId)
        .AddPlanMessage(plan.id, plan.name, content);
      this.resetCounter(planDefinitionId);
    });
  };

  public suggestPlanDirections = async (
    planDefinitionId: string,
    priorContent?: string,
  ): Promise<string[]> => {
    const plan = this.findPlanDefinition(planDefinitionId);
    if (!plan) return [];

    const systemPrompts =
      (await d.SystemPromptsService().Get()) ?? DEFAULT_SYSTEM_PROMPTS;
    const suggestionPrompt =
      plan.suggestionPrompt?.trim() ||
      systemPrompts.planSuggestionPrompt ||
      DEFAULT_SYSTEM_PROMPTS.planSuggestionPrompt;
    const suggestionModel =
      plan.suggestionModel || systemPrompts.planSuggestionModel || undefined;
    const suggestionRequestSettings =
      plan.suggestionRequestSettings ??
      systemPrompts.planSuggestionRequestSettings;

    const chatMessages = this.getChatMessagesForSuggestion(plan);
    const promptMessages = buildPlanSuggestionPromptMessages(
      chatMessages,
      plan,
      suggestionPrompt,
      priorContent,
    );

    const response = await d
      .OpenRouterChatAPI()
      .postStructuredChat<PlanSuggestionResponse>(
        promptMessages,
        PLAN_SUGGESTION_RESPONSE_FORMAT,
        suggestionModel,
        "Plan Suggestions",
        false,
        suggestionRequestSettings,
        "plan-suggestion",
      );

    return normalizePlanSuggestions(response);
  };

  // ---- Private Helpers ----

  private regenerateDuePlans = async (duePlans: Plan[]): Promise<void> => {
    await Promise.all(
      duePlans.map((plan) =>
        this.trackGeneration(plan.id, async () => {
          const chatMessages = this.getChatMessages(plan);
          await this.regeneratePlan(plan, chatMessages);
          this.resetCounter(plan.id);
        }),
      ),
    );
  };

  private resetCounter = (planId: string): void => {
    const planService = d.PlanService(this.chatId);
    const plans = planService.getPlans();
    const updatedPlans = plans.map((p) =>
      p.id === planId ? resetMessageCounter(p) : p,
    );
    planService.savePlans(updatedPlans);
  };

  private getChatMessages = (plan: Plan): LLMMessage[] => {
    if (plan.hideOtherPlans) {
      return d.LLMChatProjection(this.chatId).GetMessagesExcludingAllPlans();
    }
    if (plan.excludeOwnPlanFromHistory) {
      return d.LLMChatProjection(this.chatId).GetMessagesExcludingPlan(plan.id);
    }
    return d.LLMChatProjection(this.chatId).GetMessages();
  };

  private getChatMessagesForSuggestion = (plan: Plan): LLMMessage[] => {
    if (plan.hideOtherPlans) {
      return d.LLMChatProjection(this.chatId).GetMessagesExcludingAllPlans();
    }
    return d.LLMChatProjection(this.chatId).GetMessagesExcludingPlan(plan.id);
  };

  private findPlanDefinition = (planDefinitionId: string): Plan | undefined =>
    d
      .PlanService(this.chatId)
      .getPlans()
      .find((p) => p.id === planDefinitionId);

  /**
   * Generates new plan content via LLM and stores it as a CQRS event.
   * ChatService.AddPlanMessage handles hiding old instances first.
   */
  private regeneratePlan = async (
    plan: Plan,
    chatMessages: LLMMessage[],
  ): Promise<void> => {
    const promptMessages = buildPromptMessages(chatMessages, plan);
    const response = await d
      .OpenRouterChatAPI()
      .postChat(
        promptMessages,
        plan.model || undefined,
        "chat",
        "LLM",
        plan.modelRequestSettings,
      );
    const content = stripMarkdownCodeFence(response);
    await d
      .ChatService(this.chatId)
      .AddPlanMessage(plan.id, plan.name, content);
  };
}

/**
 * Strips wrapping markdown code fences (```markdown ... ```) that
 * LLMs sometimes add around their response.
 */
const stripMarkdownCodeFence = (text: string): string =>
  text.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
