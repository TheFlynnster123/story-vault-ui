import { useEffect, useState } from "react";
import { getPlanServiceInstance } from "../app/ChatGeneration/PlanService";
import type { Plan } from "../models/Plan";

export const usePlanCache = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const cache = getPlanServiceInstance(chatId);

  useEffect(() => {
    if (!cache) return;
    return cache.subscribe(() => forceUpdate({}));
  }, [cache]);

  return {
    plans: cache?.getPlans() || [],
    isLoading: cache?.IsLoading || false,
    updatePlanContent: (planId: string, content: string) =>
      cache?.updatePlanContent(planId, content),
    updatePlanDefinition: (planId: string, field: keyof Plan, value: string) =>
      cache?.updatePlanDefinition(planId, field, value),
    addPlan: (plan: Plan) => cache?.addPlan(plan),
    removePlan: (planId: string) => cache?.removePlan(planId),
    setAllPlans: (plans: Plan[]) => cache?.setAllPlans(plans),
    savePlans: async () => await cache?.savePlans(),
    refreshFromDatabase: async () => await cache?.refreshFromDatabase(),
    generateUpdatedPlans: async (chatMessages: any[]) =>
      await cache?.generateUpdatedPlans(chatMessages),
  };
};
