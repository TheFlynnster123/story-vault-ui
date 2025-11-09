import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Memory } from "../models/Memory";
import { d } from "../app/Dependencies/Dependencies";
import { getMemoriesQueryKey } from "../queries/memories/MemoriesService";

export interface UseMemoriesResult {
  memories: Memory[];
  isLoading: boolean;
  saveMemories: (memories: Memory[]) => Promise<void>;
  refreshMemories: () => void;
}

export const useMemories = (chatId: string): UseMemoriesResult => {
  const queryClient = useQueryClient();

  const { data: memories = [], isLoading } = useQuery({
    queryKey: getMemoriesQueryKey(chatId),
    queryFn: async () => {
      return await d.MemoriesService(chatId).fetchMemories();
    },
    enabled: !!chatId,
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const saveMemoriesMutation = useMutation({
    mutationFn: async (memories: Memory[]) => {
      await d.MemoriesService(chatId).save(memories);
      return memories;
    },
    onSuccess: (memories) => {
      // Update cache immediately
      queryClient.setQueryData(getMemoriesQueryKey(chatId), memories);
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: getMemoriesQueryKey(chatId),
      });
    },
  });

  const saveMemories = async (memories: Memory[]) => {
    await saveMemoriesMutation.mutateAsync(memories);
  };

  const refreshMemories = () => {
    queryClient.invalidateQueries({ queryKey: getMemoriesQueryKey(chatId) });
  };

  return {
    memories,
    isLoading,
    saveMemories,
    refreshMemories,
  };
};
