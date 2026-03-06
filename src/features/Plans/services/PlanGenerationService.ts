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

  public generateUpdatedPlans = async (
    chatMessages: LLMMessage[],
  ): Promise<Plan[]> => {
    const plans = d.PlanService(this.chatId).getPlans();
    const updatedPlans = await Promise.all(
      plans.map((plan) => this.processplan(plan, chatMessages)),
    );
    await d.PlanService(this.chatId).savePlans(updatedPlans);
    return updatedPlans;
  };

  public hasPlansNeedingRefresh = (): boolean => {
    const plans = d.PlanService(this.chatId).getPlans();
    return plans.some(isDueForRefresh);
  };

  private processplan = async (
    plan: Plan,
    chatMessages: LLMMessage[],
  ): Promise<Plan> => {
    if (isDueForRefresh(plan)) {
      return this.regeneratePlan(plan, chatMessages);
    }
    return incrementMessageCounter(plan);
  };

  private regeneratePlan = async (
    plan: Plan,
    chatMessages: LLMMessage[],
  ): Promise<Plan> => {
    const promptMessages = buildPromptMessages(chatMessages, plan);
    const response = await d.GrokChatAPI().postChat(promptMessages);
    return resetMessageCounter({ ...plan, content: response });
  };
}
