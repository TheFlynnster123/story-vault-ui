import { useEffect, useState } from "react";
import { getPlanServiceInstance } from "../services/PlanService";
import type { Plan } from "../services/Plan";

export const usePlanCache = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const cache = getPlanServiceInstance(chatId);

  useEffect(() => {
    if (!cache) return;
    return cache.subscribe(() => forceUpdate({}));
  }, [cache]);

  return {
    plans: cache?.GetPlans() || [],
    updatePlanDefinition: (planId: string, field: keyof Plan, value: string) =>
      cache?.UpdatePlanDefinition(planId, field, value),
    addPlan: (plan: Plan) => cache?.AddPlan(plan),
    deletePlan: (planId: string) => cache?.RemovePlan(planId),
    savePlans: async () => await cache?.SavePlans(),
  };
};
