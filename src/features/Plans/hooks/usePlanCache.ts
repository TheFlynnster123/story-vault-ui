import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";
import type { Plan, PlanFieldValue } from "../services/Plan";

export const usePlanCache = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const cache = d.PlanService(chatId);

  useEffect(() => {
    return cache.subscribe(() => forceUpdate({}));
  }, [cache]);

  return {
    plans: cache.getPlans(),
    updatePlanDefinition: (
      planId: string,
      field: keyof Plan,
      value: PlanFieldValue,
    ) => cache.updatePlanDefinition(planId, field, value),
    addPlan: (plan: Plan) => cache.addPlan(plan),
    deletePlan: (planId: string) => cache.removePlan(planId),
    savePlans: async () => await cache.savePlans(),
  };
};
