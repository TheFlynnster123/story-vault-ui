import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import type { Plan } from "./Plan";
import {
  isDueForRefresh,
  resetMessageCounter,
  incrementMessageCounter,
} from "./Plan";

const buildPlanPrompt = (plan: Plan): string =>
  [
    `# ${plan.name}`,
    ``,
    `Consider the full chat history above.`,
    `Generate a plan in Markdown. No preamble or additional commentary.`,
    ``,
    plan.prompt,
  ].join("\n");

const buildPromptMessages = (
  chatMessages: LLMMessage[],
  plan: Plan,
): LLMMessage[] => [...chatMessages, toSystemMessage(buildPlanPrompt(plan))];

export class PlanGenerationService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

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

    const chatMessages = d.LLMChatProjection(this.chatId).GetMessages();
    await this.regeneratePlan(plan, chatMessages);

    const updatedPlan = resetMessageCounter(plan);
    const updatedPlans = plans.map((p) => (p.id === planId ? updatedPlan : p));
    await d.PlanService(this.chatId).savePlans(updatedPlans);
  };

  public hasPlansNeedingRefresh = (): boolean => {
    const plans = d.PlanService(this.chatId).getPlans();
    return plans.some(isDueForRefresh);
  };

  private processPlan = async (
    plan: Plan,
    chatMessages: LLMMessage[],
  ): Promise<Plan> => {
    if (isDueForRefresh(plan)) {
      await this.regeneratePlan(plan, chatMessages);
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
