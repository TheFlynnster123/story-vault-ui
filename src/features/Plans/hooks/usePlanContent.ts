import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";

export const usePlanContent = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const projection = d.UserChatProjection(chatId);

  useEffect(() => {
    return projection.subscribe(() => forceUpdate({}));
  }, [projection]);

  const getLatestPlanContent = (planDefinitionId: string): string | undefined =>
    projection.GetLatestPlanContent(planDefinitionId);

  return { getLatestPlanContent };
};
