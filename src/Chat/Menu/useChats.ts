import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChatHistoryApi } from "../../hooks/useChatHistoryAPI";
import { useBlobAPI } from "../../hooks/useBlobAPI";

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

  const refreshChats = () => {
    queryClient.invalidateQueries({ queryKey: ["chat-ids"] });
  };

  return {
    chatIds,
    refreshChats,
    isLoading: isLoadingChats,
    error: chatError,
  };
};
