import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatHistoryAPI } from "../../../clients/ChatHistoryAPI";

export const useChats = () => {
  const queryClient = useQueryClient();

  const {
    data: chatIds = [],
    isLoading: isLoadingChats,
    error: chatError,
  } = useQuery({
    queryKey: ["chat-ids"],
    queryFn: async () => {
      return await new ChatHistoryAPI().getChats();
    },
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
