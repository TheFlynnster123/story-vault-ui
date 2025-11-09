import { useQuery, useQueryClient } from "@tanstack/react-query";
import { d } from "../app/Dependencies/Dependencies";

export const getChatIdsQueryKey = () => ["chat-ids"];

export const useChats = () => {
  const queryClient = useQueryClient();

  const {
    data: chatIds = [],
    isLoading: isLoadingChats,
    error: chatError,
  } = useQuery({
    queryKey: getChatIdsQueryKey(),
    queryFn: async () => {
      return await d.ChatHistoryApi().getChatIds();
    },
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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
