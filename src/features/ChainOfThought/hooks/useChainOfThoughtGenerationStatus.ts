import { useState, useEffect } from "react";
import { d } from "../../../services/Dependencies";

export const useChainOfThoughtGenerationStatus = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const service = d.ChainOfThoughtGenerationService(chatId);

  useEffect(() => {
    return service.subscribe(() => forceUpdate({}));
  }, [service]);

  return {
    isGenerating: service.getIsGenerating(),
  };
};
