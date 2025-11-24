import { useQuery } from "@tanstack/react-query";
import { d } from "../app/Dependencies/Dependencies";

export const getChatIdsQueryKey = () => ["chat-ids"];

export const useChats = () => {
  const {
    data: chatIds = [],
    isLoading: isLoadingChats,
    error: chatError,
  } = useQuery({
    queryKey: getChatIdsQueryKey(),
    queryFn: async () => {
      return await d.ChatAPI().getChatIds();
    },
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    chatIds,
    isLoading: isLoadingChats,
    error: chatError,
  };
};
