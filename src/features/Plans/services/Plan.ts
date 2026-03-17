export interface Plan {
  id: string;
  type: PlanType;
  name: string;
  prompt: string;
  model?: string;
  refreshInterval: number;
  messagesSinceLastUpdate: number;
}

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
  refreshInterval: plan.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
  messagesSinceLastUpdate: plan.messagesSinceLastUpdate ?? 0,
});

export const isDueForRefresh = (plan: Plan): boolean =>
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
  const remaining = Math.max(
    0,
    plan.refreshInterval - plan.messagesSinceLastUpdate,
  );
  return `${remaining}/${plan.refreshInterval}`;
};
