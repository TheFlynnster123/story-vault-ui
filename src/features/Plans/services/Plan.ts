import type { OpenRouterRequestSettings } from "../../OpenRouter/services/OpenRouterRequestSettings";

export interface Plan {
  id: string;
  type: PlanType;
  name: string;
  prompt: string;
  model?: string;
  modelRequestSettings?: OpenRouterRequestSettings;
  suggestionPrompt?: string;
  suggestionModel?: string;
  suggestionRequestSettings?: OpenRouterRequestSettings;
  refreshInterval: number;
  messagesSinceLastUpdate: number;
  consolidateMessageHistory: boolean;
  hideOtherPlans: boolean;
  excludeOwnPlanFromHistory: boolean;
}

export type PlanFieldValue = Plan[keyof Plan];

/**
 * @deprecated Represents the legacy plan shape that included blob-stored content.
 * Used only during migration to strip the content field from old plan data.
 */
export interface LegacyPlan extends Plan {
  content?: string;
}

type PlanType = "planning";

export const DEFAULT_REFRESH_INTERVAL = 5;

export const DEFAULT_PLAN_PROMPT = `Analyze the full chat history above and produce a structured Markdown plan covering:
- **Active Character Arcs**: How each character is developing
- **Unresolved Threads**: Open questions, foreshadowing, or dangling plot lines
- **Story Direction**: Determine what specifically should happen next over the course of the next dozen messages to create a compelling narrative arc. Consider what the user's interests seem to be!

Keep it concise and actionable. Update sections rather than rewriting from scratch when possible.`;

export const DEFAULT_PLAN_NAME = "Story Plan";

export const DEFAULT_PLAN_SUGGESTION_PROMPT = `Review the full chat history above and suggest three distinct possible directions for the next story plan.

Each suggestion must be a single sentence that is specific enough to guide a full plan, grounded in the current story context, and meaningfully different from the others.

Return exactly one JSON object matching the configured schema.`;

export const isAutoRefreshDisabled = (plan: Plan): boolean =>
  plan.refreshInterval === 0;

export const applyPlanDefaults = (
  plan: Partial<Plan> & {
    id: string;
    type: PlanType;
    name: string;
    prompt: string;
  },
): Plan => ({
  id: plan.id,
  type: plan.type,
  name: plan.name,
  prompt: plan.prompt,
  model: plan.model,
  modelRequestSettings: plan.modelRequestSettings,
  suggestionPrompt: plan.suggestionPrompt,
  suggestionModel: plan.suggestionModel,
  suggestionRequestSettings: plan.suggestionRequestSettings,
  refreshInterval: plan.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
  messagesSinceLastUpdate: plan.messagesSinceLastUpdate ?? 0,
  consolidateMessageHistory: plan.consolidateMessageHistory ?? false,
  hideOtherPlans: plan.hideOtherPlans ?? false,
  excludeOwnPlanFromHistory: plan.excludeOwnPlanFromHistory ?? false,
});

export const isDueForRefresh = (plan: Plan): boolean =>
  !isAutoRefreshDisabled(plan) &&
  plan.messagesSinceLastUpdate >= plan.refreshInterval;

export const resetMessageCounter = (plan: Plan): Plan => ({
  ...plan,
  messagesSinceLastUpdate: 0,
});

export const incrementMessageCounter = (plan: Plan): Plan => ({
  ...plan,
  messagesSinceLastUpdate: plan.messagesSinceLastUpdate + 1,
});

export const formatRefreshStatus = (plan: Plan): string => {
  if (isAutoRefreshDisabled(plan)) {
    return "Manual generation only";
  }

  const remaining = Math.max(
    0,
    plan.refreshInterval - plan.messagesSinceLastUpdate,
  );
  return `${remaining}/${plan.refreshInterval}`;
};
