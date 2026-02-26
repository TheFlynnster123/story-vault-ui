import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";
import type { Plan } from "../services/Plan";

export const usePlanCache = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const cache = d.PlanService(chatId);

  useEffect(() => {
    return cache.subscribe(() => forceUpdate({}));
  }, [cache]);

  return {
    plans: cache.GetPlans(),
    updatePlanDefinition: (planId: string, field: keyof Plan, value: string) =>
      cache.UpdatePlanDefinition(planId, field, value),
    addPlan: (plan: Plan) => cache.AddPlan(plan),
    deletePlan: (planId: string) => cache.RemovePlan(planId),
    savePlans: async () => await cache.SavePlans(),
  };
};
