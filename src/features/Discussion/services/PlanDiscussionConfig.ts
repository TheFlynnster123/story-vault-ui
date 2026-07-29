import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";
import type { Plan } from "../../Plans/services/Plan";
import type { DiscussionConfig } from "./DiscussionConfig";
import type { LLMContextSelection } from "../../Chat/services/ChatGeneration/LLMMessageContextService";

const PLAN_DISCUSSION_CONTEXT_SELECTION = {
  history: true,
} as const satisfies LLMContextSelection;

/**
 * Creates a DiscussionConfig for discussing a specific plan.
 */
export const createPlanDiscussionConfig = (
  chatId: string,
  planId: string,
  discussPlanPrompt?: string,
): DiscussionConfig => {
  const findPlan = (): Plan | undefined =>
    d
      .PlanService(chatId)
      .getPlans()
      .find((p) => p.id === planId);

  const getLatestPlanContent = (): string | undefined =>
    d.UserChatProjection(chatId).GetLatestPlanContent(planId);

  const getChatMessages = (): Promise<LLMMessage[]> =>
    d
      .LLMMessageContextService(chatId)
      .buildContext(PLAN_DISCUSSION_CONTEXT_SELECTION);

  const resolvedDiscussionPrompt = (): string =>
    discussPlanPrompt || DEFAULT_SYSTEM_PROMPTS.discussPlanPrompt;

  const buildSystemPrompt = (): string => {
    const plan = findPlan();
    if (!plan) return "";

    const latestPlanContent = getLatestPlanContent();

    const lines = [
      `# Plan Discussion — ${plan.name}`,
      ``,
      resolvedDiscussionPrompt(),
    ];

    if (latestPlanContent) {
      lines.push(``, `Current plan:`, `---`, latestPlanContent, `---`);
    }

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
