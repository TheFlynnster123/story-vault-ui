import { useEffect, useMemo, useState } from "react";
import { d } from "../../../services/Dependencies";

export const useStoryDirectionChat = (chatId: string, planId: string) => {
  const [, forceUpdate] = useState({});

  const service = useMemo(
    () => d.StoryDirectionService(chatId, planId),
    [chatId, planId],
  );

  useEffect(() => {
    return service.subscribe(() => forceUpdate({}));
  }, [service]);

  return {
    messages: service.getMessages(),
    isGenerating: service.isGenerating(),
    planModel: service.getPlanModel(),
    sendMessage: service.sendMessage,
    generateUpdatedPlan: service.generateUpdatedPlan,
  };
};
