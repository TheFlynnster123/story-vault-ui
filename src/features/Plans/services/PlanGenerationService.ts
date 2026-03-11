import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { createInstanceCache } from "../../../services/Utils/getOrCreateInstance";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import type { Plan } from "./Plan";
import {
  isDueForRefresh,
  resetMessageCounter,
  incrementMessageCounter,
} from "./Plan";

export const getPlanGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new PlanGenerationService(chatId),
);

const buildPlanPrompt = (plan: Plan): string =>
  [
    `# ${plan.name}`,
    ``,
    `Consider the full chat history above.`,
    `Generate a plan in Markdown. No preamble or additional commentary.`,
    ``,
    plan.prompt,
  ].join("\n");

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
): LLMMessage[] => [...chatMessages, toSystemMessage(buildPlanPrompt(plan))];

const buildUpdatePromptMessages = (
  chatMessages: LLMMessage[],
  plan: Plan,
  priorContent: string,
  feedback?: string,
): LLMMessage[] => [
  ...chatMessages,
  toSystemMessage(buildUpdatePlanPrompt(plan, priorContent, feedback)),
];

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

  /**
   * Checks each plan's refresh cadence and regenerates any that are due.
   * Plans not due get their counter incremented.
   * Generated content is stored as CQRS events in the chat timeline.
   */
  public generateUpdatedPlans = async (
    chatMessages: LLMMessage[],
  ): Promise<void> => {
    const plans = d.PlanService(this.chatId).getPlans();
    const updatedPlans = await Promise.all(
      plans.map((plan) => this.processPlan(plan, chatMessages)),
    );
    await d.PlanService(this.chatId).savePlans(updatedPlans);
  };

  /**
   * Generates a plan on demand, regardless of refresh cadence.
   * Used by the "Generate Now" button on the Plan page.
   */
  public generatePlanNow = async (planId: string): Promise<void> => {
    const plans = d.PlanService(this.chatId).getPlans();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    await this.trackGeneration(planId, async () => {
      const chatMessages = d.LLMChatProjection(this.chatId).GetMessages();
      await this.regeneratePlan(plan, chatMessages);

      const updatedPlan = resetMessageCounter(plan);
      const updatedPlans = plans.map((p) =>
        p.id === planId ? updatedPlan : p,
      );
      await d.PlanService(this.chatId).savePlans(updatedPlans);
    });
  };

  public hasPlansNeedingRefresh = (): boolean => {
    const plans = d.PlanService(this.chatId).getPlans();
    return plans.some(isDueForRefresh);
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
      const chatMessages = d
        .LLMChatProjection(this.chatId)
        .GetMessagesExcludingPlan(planDefinitionId);

      const promptMessages = priorContent
        ? buildUpdatePromptMessages(chatMessages, plan, priorContent, feedback)
        : buildPromptMessages(chatMessages, plan);

      const response = await d.GrokChatAPI().postChat(promptMessages);
      const content = stripMarkdownCodeFence(response);
      await d
        .ChatService(this.chatId)
        .AddPlanMessage(plan.id, plan.name, content);
    });
  };

  private findPlanDefinition = (planDefinitionId: string): Plan | undefined =>
    d
      .PlanService(this.chatId)
      .getPlans()
      .find((p) => p.id === planDefinitionId);

  private processPlan = async (
    plan: Plan,
    chatMessages: LLMMessage[],
  ): Promise<Plan> => {
    if (isDueForRefresh(plan)) {
      await this.trackGeneration(plan.id, () =>
        this.regeneratePlan(plan, chatMessages),
      );
      return resetMessageCounter(plan);
    }
    return incrementMessageCounter(plan);
  };

  /**
   * Generates new plan content via LLM and stores it as a CQRS event.
   * ChatService.AddPlanMessage handles hiding old instances first.
   */
  private regeneratePlan = async (
    plan: Plan,
    chatMessages: LLMMessage[],
  ): Promise<void> => {
    const promptMessages = buildPromptMessages(chatMessages, plan);
    const response = await d.GrokChatAPI().postChat(promptMessages);
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
