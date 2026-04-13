import { useEffect, useMemo, useState } from "react";
import { StoryDirectionService } from "../services/StoryDirectionService";

export const useStoryDirectionChat = (chatId: string, planId: string) => {
  const [, forceUpdate] = useState({});

  const service = useMemo(
    () => new StoryDirectionService(chatId, planId),
    [chatId, planId],
  );

  useEffect(() => {
    return service.subscribe(() => forceUpdate({}));
  }, [service]);

  return {
    messages: service.getMessages(),
    isGenerating: service.isGenerating(),
    sendMessage: service.sendMessage,
    generateUpdatedPlan: service.generateUpdatedPlan,
  };
};
