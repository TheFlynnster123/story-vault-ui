import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";

export const usePlanGenerationStatus = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const service = d.PlanGenerationService(chatId);

  useEffect(() => {
    return service.subscribe(() => forceUpdate({}));
  }, [service]);

  return {
    isGenerating: service.isGenerating,
    generatingPlanIds: service.getGeneratingPlanIds(),
    hasAnyGenerating: service.getGeneratingPlanIds().size > 0,
  };
};
