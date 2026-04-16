import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import type { Plan } from "../../Plans/services/Plan";
import type { DiscussionConfig } from "./DiscussionConfig";

/**
 * Creates a DiscussionConfig for discussing a specific plan.
 */
export const createPlanDiscussionConfig = (
  chatId: string,
  planId: string,
): DiscussionConfig => {
  const findPlan = (): Plan | undefined =>
    d
      .PlanService(chatId)
      .getPlans()
      .find((p) => p.id === planId);

  const getLatestPlanContent = (): string | undefined => {
    const messages = d.LLMChatProjection(chatId).GetMessages();
    const planMessages = messages.filter((m) => m.id?.startsWith("plan-"));

    for (let i = planMessages.length - 1; i >= 0; i--) {
      const msg = planMessages[i];
      if (msg.content?.includes(`[Plan: `)) {
        const match = msg.content.match(
          /\[Plan: [^\]]+\]\n([\s\S]*)\n\[End of Plan\]/,
        );
        if (match) return match[1];
        return msg.content;
      }
    }

    return undefined;
  };

  const getChatMessages = (): LLMMessage[] => {
    const plan = findPlan();
    if (!plan) return [];

    if (plan.hideOtherPlans) {
      return d.LLMChatProjection(chatId).GetMessagesExcludingAllPlans();
    }
    return d.LLMChatProjection(chatId).GetMessagesExcludingPlan(planId);
  };

  const buildSystemPrompt = (): string => {
    const plan = findPlan();
    if (!plan) return "";

    const latestPlanContent = getLatestPlanContent();

    const lines = [
      `# Plan Discussion — ${plan.name}`,
      ``,
      `You are helping the user discuss and refine their story plan.`,
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
      `The user would like to discuss what the story plan should contain.`,
      `Engage in a helpful, creative conversation about story possibilities.`,
      `Suggest ideas, ask clarifying questions, and help them refine their vision.`,
      `Keep responses concise and focused on actionable plan improvements.`,
    );

    return lines.join("\n");
  };

  const getDefaultModel = (): string | undefined => findPlan()?.model;

  const generateFromFeedback = async (feedback: string): Promise<void> => {
    const priorContent = getLatestPlanContent();

    await d
      .PlanGenerationService(chatId)
      .regeneratePlanFromMessage(planId, priorContent || undefined, feedback);
  };

  return {
    buildSystemPrompt,
    getChatMessages,
    getDefaultModel,
    generateFromFeedback,
  };
};
