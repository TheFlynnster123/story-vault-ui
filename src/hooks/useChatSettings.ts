import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlobAPI } from "./useBlobAPI";
import { ChatSettingsManager } from "../Managers/ChatSettingsManager";
import type { ChatSettings } from "../models/ChatSettings";

export const useChatSettings = (chatIds: string[]) => {
  const blobAPI = useBlobAPI();
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: chatIds.map((chatId) => ({
      queryKey: ["chatSettings", chatId],
      queryFn: async () => {
        if (!blobAPI) return null;
        const manager = new ChatSettingsManager(blobAPI);
        return manager.get(chatId);
      },
      enabled: !!blobAPI && !!chatId,
    })),
  });

  const chatSettings = new Map<string, ChatSettings | null>(
    chatIds.map((chatId, index) => [chatId, results[index].data ?? null])
  );

  const isLoading = results.some((result) => result.isLoading);
  const error = results.find((result) => result.error)?.error;

  const createMutation = useMutation({
    mutationFn: async ({
      chatId,
      settings,
    }: {
      chatId: string;
      settings: ChatSettings;
    }) => {
      if (!blobAPI) throw new Error("BlobAPI not available");
      const manager = new ChatSettingsManager(blobAPI);
      await manager.create(chatId, settings);
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ["chatSettings", chatId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      chatId,
      settings,
    }: {
      chatId: string;
      settings: ChatSettings;
    }) => {
      if (!blobAPI) throw new Error("BlobAPI not available");
      const manager = new ChatSettingsManager(blobAPI);
      await manager.update(chatId, settings);
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ["chatSettings", chatId] });
    },
  });

  return {
    chatSettings,
    isLoading,
    error,
    createChatSettings: createMutation.mutateAsync,
    updateChatSettings: updateMutation.mutateAsync,
  };
};
