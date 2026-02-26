import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { toSystemMessage } from "../../../services/Utils/MessageUtils";
import type { Plan } from "./Plan";

export class PlanGenerationService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  public generateUpdatedPlans = async (
    chatMessages: LLMMessage[],
  ): Promise<Plan[]> => {
    const plans = d.PlanService(this.chatId).GetPlans();
    const updatedPlans = await Promise.all(
      plans.map((plan) => this.generatePlanContent(plan, chatMessages)),
    );
    await d.PlanService(this.chatId).SavePlans(updatedPlans);
    return updatedPlans;
  };

  private generatePlanContent = async (
    plan: Plan,
    chatMessages: LLMMessage[],
  ): Promise<Plan> => {
    const promptMessages: LLMMessage[] = [
      ...chatMessages,
      toSystemMessage(
        `#${plan.name}\r\n
          ~ Consider the chat history above, and generate a plan in Markdown without preamble or additional text ~
          ${plan.prompt}
          \r\n
          =====
          \r\n`,
      ),
    ];

    const response = await d.GrokChatAPI().postChat(promptMessages);

    return { ...plan, content: response };
  };
}
