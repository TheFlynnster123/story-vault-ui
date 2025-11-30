import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Memory } from "../models/Memory";
import { d } from "../app/Dependencies/Dependencies";
import { getMemoriesQueryKey } from "../queries/memories/MemoriesService";

interface UseMemoriesResult {
  memories: Memory[];
  isLoading: boolean;
  saveMemories: (memories: Memory[]) => Promise<void>;
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
      queryClient.setQueryData(getMemoriesQueryKey(chatId), memories);
    },
  });

  const saveMemories = async (memories: Memory[]) => {
    await saveMemoriesMutation.mutateAsync(memories);
  };

  return {
    memories,
    isLoading,
    saveMemories,
  };
};
