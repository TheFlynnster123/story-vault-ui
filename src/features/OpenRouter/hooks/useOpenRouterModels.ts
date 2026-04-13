import { useQuery } from "@tanstack/react-query";
import { d } from "../../../services/Dependencies";
import type { OpenRouterModel } from "../services/OpenRouterModelsAPI";

export const getOpenRouterModelsQueryKey = () => ["openrouter-models"];

export const useOpenRouterModels = (): {
  models: OpenRouterModel[];
  isLoading: boolean;
} => {
  const { data, isLoading } = useQuery({
    queryKey: getOpenRouterModelsQueryKey(),
    queryFn: () => d.OpenRouterModelsAPI().getModels(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  return {
    models: data ?? [],
    isLoading,
  };
};
