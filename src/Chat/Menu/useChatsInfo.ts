import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChatSettings } from "../../hooks/useChatSettings";
import { useChatHistoryApi } from "../../hooks/useChatHistoryAPI";
import { useEffect } from "react";

export const useChatsInfo = () => {
  const chatHistoryAPI = useChatHistoryApi();
  const { chatSettings, loadChatSettings } = useChatSettings();
  const queryClient = useQueryClient();

  // Query for fetching chat IDs
  const {
    data: chatIds = [],
    isLoading,
    error,
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

  // Load chat settings when chat IDs change
  useEffect(() => {
    if (chatIds.length > 0) {
      Promise.all(chatIds.map((chatId) => loadChatSettings(chatId))).catch(
        (error) => {
          console.error("Failed to load chat settings:", error);
        }
      );
    }
  }, [chatIds]); // Removed loadChatSettings to prevent infinite re-renders

  const refreshChats = () => {
    queryClient.invalidateQueries({ queryKey: ["chats"] });
  };

  return {
    chatIds,
    chatSettings,
    refreshChats,
    isLoading,
    error,
  };
};
