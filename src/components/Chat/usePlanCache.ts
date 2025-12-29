import { useEffect, useState } from "react";
import { getPlanServiceInstance } from "../../services/ChatGeneration/PlanService";
import type { Plan } from "../../services/ChatGeneration/Plan";

export const usePlanCache = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const cache = getPlanServiceInstance(chatId);

  useEffect(() => {
    if (!cache) return;
    return cache.subscribe(() => forceUpdate({}));
  }, [cache]);

  return {
    plans: cache?.getPlans() || [],
    updatePlanDefinition: (planId: string, field: keyof Plan, value: string) =>
      cache?.updatePlanDefinition(planId, field, value),
    addPlan: (plan: Plan) => cache?.addPlan(plan),
    deletePlan: (planId: string) => cache?.removePlan(planId),
    savePlans: async () => await cache?.savePlans(),
  };
};
