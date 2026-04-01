import { useState, useEffect } from "react";
import { d } from "../../../services/Dependencies";
import type { ChainOfThoughtStep } from "../services/ChainOfThought";

export const useChainOfThoughtCache = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const service = d.ChainOfThoughtService(chatId);

  useEffect(() => {
    return service.subscribe(() => forceUpdate({}));
  }, [service]);

  return {
    chainOfThought: service.getChainOfThought(),
    isLoading: service.IsLoading,
    updateChainOfThoughtDefinition: (
      field: keyof Pick<import("../services/ChainOfThought").ChainOfThought, "name" | "steps">,
      value: string | ChainOfThoughtStep[],
    ) => service.updateChainOfThoughtDefinition(field, value),
    updateStep: (
      stepId: string,
      field: keyof ChainOfThoughtStep,
      value: string | boolean,
    ) => service.updateStep(stepId, field, value),
    addStep: (step: ChainOfThoughtStep) => service.addStep(step),
    removeStep: (stepId: string) => service.removeStep(stepId),
    savePendingChanges: () => service.savePendingChanges(),
  };
};
