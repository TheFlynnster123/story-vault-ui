import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useChatHistoryApi } from "../../hooks/useChatHistoryAPI";
import { useBlobAPI } from "../../hooks/useBlobAPI";
import {
  GetChatSettings,
  getChatSettingsQueryKey,
} from "../../hooks/queries/useChatSettingsQuery";
import type { ChatSettings } from "../../models";

export const useChats = () => {
  const chatHistoryAPI = useChatHistoryApi();
  const blobAPI = useBlobAPI();
  const queryClient = useQueryClient();

  const {
    data: chatIds = [],
    isLoading: isLoadingChats,
    error: chatError,
  } = useQuery({
    queryKey: ["chat-ids"],
    queryFn: async () => {
      if (!chatHistoryAPI) {
        throw new Error("ChatHistoryAPI not available");
      }
      return await chatHistoryAPI.getChats();
    },
    enabled: !!chatHistoryAPI,
  });

  const chatSettingsResults = useQueries({
    queries: chatIds.map((chatId) => ({
      queryKey: getChatSettingsQueryKey(chatId),
      queryFn: async () => await GetChatSettings(chatId, blobAPI!),
      enabled: !!blobAPI,
    })),
  });

  const chatSettings = Object.fromEntries(
    chatIds.map((chatId, index) => [chatId, chatSettingsResults[index].data])
  );

  const isLoadingSettings = chatSettingsResults.some(
    (result) => result.isLoading
  );
  const settingsError = chatSettingsResults.find(
    (result) => result.error
  )?.error;

  const refreshChats = () => {
    queryClient.invalidateQueries({ queryKey: ["chat-ids"] });
  };

  return {
    chatIds,
    chatSettings,
    refreshChats,
    isLoading: isLoadingChats || isLoadingSettings,
    error: chatError || settingsError,
  };
};
