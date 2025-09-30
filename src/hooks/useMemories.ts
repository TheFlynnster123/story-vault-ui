import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlobAPI } from "../clients/BlobAPI";
import type { Memory } from "../models/Memory";
import { d } from "../app/Dependencies/Dependencies";

const getQueryKey = (chatId: string) => ["memories", chatId];

export interface UseMemoriesResult {
  memories: Memory[];
  isLoading: boolean;
  saveMemories: (memories: Memory[]) => Promise<void>;
  refreshMemories: () => void;
}

export const useMemories = (chatId: string): UseMemoriesResult => {
  const queryClient = useQueryClient();
  const saveMemoriesMutation = useSaveMemoriesMutation(chatId);

  const { data: memories = [], isLoading } = useQuery({
    queryKey: getQueryKey(chatId),
    queryFn: async () => await GetMemories(chatId),
    enabled: !!chatId,
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const saveMemories = async (memories: Memory[]) => {
    await saveMemoriesMutation.mutateAsync(memories);
  };

  const refreshMemories = () => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(chatId) });
  };

  return {
    memories,
    isLoading,
    saveMemories,
    refreshMemories,
  };
};

export const GetMemories = async (chatId: string): Promise<Memory[]> => {
  const blobContent = await new BlobAPI().getBlob(chatId, "memories");
  if (!blobContent) return [];

  try {
    return JSON.parse(blobContent) as Memory[];
  } catch (e) {
    d.ErrorService().log("Failed to parse memories", e);
    return [];
  }
};

const useSaveMemoriesMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memories: Memory[]) => {
      const content = JSON.stringify(memories);
      await new BlobAPI().saveBlob(chatId, "memories", content);
      return memories;
    },
    onSuccess: (memories) => {
      queryClient.setQueryData(getQueryKey(chatId), memories);
    },
  });
};
