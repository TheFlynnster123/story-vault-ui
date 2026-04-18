import { useEffect, useState } from "react";
import type { DiscussionService } from "../services/DiscussionService";

export const useDiscussionChat = (service: DiscussionService) => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return service.subscribe(() => forceUpdate({}));
  }, [service]);

  return {
    messages: service.getMessages(),
    isGenerating: service.isGenerating(),
    defaultModel: service.getDefaultModel(),
    pendingResult: service.getPendingResult(),
    requiresApproval: service.requiresApproval(),
    sendMessage: service.sendMessage,
    generateFromFeedback: service.generateFromFeedback,
    generateInitialMessage: service.generateInitialMessage,
    sendFinalFeedbackAndGenerate: service.sendFinalFeedbackAndGenerate,
    applyPendingResult: service.applyPendingResult,
  };
};
