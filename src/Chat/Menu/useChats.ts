import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChatSettings } from "../../hooks/useChatSettings";
import { useChatHistoryApi } from "../../hooks/useChatHistoryAPI";

export const useChats = () => {
  const chatHistoryAPI = useChatHistoryApi();
  const queryClient = useQueryClient();

  // Query for fetching chat IDs
  const {
    data: chatIds = [],
    isLoading: isLoadingChats,
    error: chatError,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      if (!chatHistoryAPI) {
        throw new Error("ChatHistoryAPI not available");
      }
      return await chatHistoryAPI.getChats();
    },
    enabled: !!chatHistoryAPI,
  });

  const {
    chatSettings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useChatSettings(chatIds);

  const refreshChats = () => {
    queryClient.invalidateQueries({ queryKey: ["chats"] });
  };

  return {
    chatIds,
    chatSettings,
    refreshChats,
    isLoading: isLoadingChats || isLoadingSettings,
    error: chatError || settingsError,
  };
};
