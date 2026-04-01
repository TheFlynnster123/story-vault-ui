import { useState, useEffect } from "react";
import { d } from "../../../services/Dependencies";
import type { ChainOfThought, ChainOfThoughtStep } from "../services/ChainOfThought";

export const useChainOfThoughtCache = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const service = d.ChainOfThoughtService(chatId);

  useEffect(() => {
    return service.subscribe(() => forceUpdate({}));
  }, [service]);

  return {
    chainOfThoughts: service.getChainOfThoughts(),
    isLoading: service.IsLoading,
    addChainOfThought: (cot: ChainOfThought) => service.addChainOfThought(cot),
    removeChainOfThought: (cotId: string) =>
      service.removeChainOfThought(cotId),
    updateChainOfThoughtDefinition: (
      cotId: string,
      field: keyof ChainOfThought,
      value: string | ChainOfThoughtStep[],
    ) => service.updateChainOfThoughtDefinition(cotId, field, value),
    updateStep: (
      cotId: string,
      stepId: string,
      field: keyof ChainOfThoughtStep,
      value: string | boolean,
    ) => service.updateStep(cotId, stepId, field, value),
    addStep: (cotId: string, step: ChainOfThoughtStep) =>
      service.addStep(cotId, step),
    removeStep: (cotId: string, stepId: string) =>
      service.removeStep(cotId, stepId),
    savePendingChanges: () => service.savePendingChanges(),
  };
};
