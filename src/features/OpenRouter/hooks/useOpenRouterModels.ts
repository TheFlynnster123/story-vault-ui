import { useQuery } from "@tanstack/react-query";
import { d } from "../../../services/Dependencies";
import type {
  OpenRouterModel,
  OpenRouterModelEndpoint,
} from "../services/OpenRouterModelsAPI";

export const getOpenRouterModelsQueryKey = () => ["openrouter-models"];
export const getOpenRouterModelEndpointsQueryKey = (modelId: string) => [
  "openrouter-model-endpoints",
  modelId,
];

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

export const useOpenRouterModelEndpoints = (
  modelId: string,
): {
  endpoints: OpenRouterModelEndpoint[];
  isLoading: boolean;
  isError: boolean;
} => {
  const { data, isLoading, isError } = useQuery({
    queryKey: getOpenRouterModelEndpointsQueryKey(modelId),
    queryFn: () => d.OpenRouterModelsAPI().getModelEndpoints(modelId),
    staleTime: 5 * 60 * 1_000,
    gcTime: 30 * 60 * 1_000,
    retry: 2,
  });

  return {
    endpoints: data ?? [],
    isLoading,
    isError,
  };
};
