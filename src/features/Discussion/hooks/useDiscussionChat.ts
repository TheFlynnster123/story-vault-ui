import { useEffect, useState } from "react";
import type { DiscussionService } from "../services/DiscussionService";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";

export const useDiscussionChat = (service: DiscussionService) => {
  const [, forceUpdate] = useState({});
  const [llmContext, setLLMContext] = useState<LLMMessage[]>([]);

  useEffect(() => {
    return service.subscribe(() => forceUpdate({}));
  }, [service]);

  const messages = service.getMessages();

  useEffect(() => {
    let active = true;
    setLLMContext([]);
    void service
      .getLLMContext()
      .then((context) => {
        if (active) setLLMContext(context);
      })
      .catch((error) =>
        d.ErrorService().log("Failed to build discussion context", error),
      );
    return () => {
      active = false;
    };
  }, [service, messages]);

  return {
    messages,
    llmContext,
    isGenerating: service.isGenerating(),
    defaultModel: service.getDefaultModel(),
    defaultRequestSettings: service.getDefaultRequestSettings(),
    sendMessage: service.sendMessage,
    generateFromFeedback: service.generateFromFeedback,
    generateInitialMessage: service.generateInitialMessage,
    sendFinalFeedbackAndGenerate: service.sendFinalFeedbackAndGenerate,
    acceptMessage: service.acceptMessage,
    canAcceptMessage: service.canAcceptMessage(),
  };
};
