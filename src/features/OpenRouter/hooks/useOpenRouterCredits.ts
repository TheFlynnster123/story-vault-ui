import { useQuery } from "@tanstack/react-query";
import { d } from "../../../services/Dependencies";
import {
  getOpenRouterCreditsQueryKey,
  type OpenRouterCredits,
} from "../services/OpenRouterCreditsAPI";

export const useOpenRouterCredits = (): {
  credits: OpenRouterCredits | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: getOpenRouterCreditsQueryKey(),
    queryFn: () => d.OpenRouterCreditsAPI().getCredits(),
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
    retry: 2,
  });

  return {
    credits: data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
