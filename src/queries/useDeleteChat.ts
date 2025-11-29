import { useMutation, useQueryClient } from "@tanstack/react-query";
import { d } from "../app/Dependencies/Dependencies";
import { getChatSettingsQueryKey } from "./chat-settings/ChatSettingsService";
import { getMemoriesQueryKey } from "./memories/MemoriesService";
import { getPlanQueryKey } from "../app/ChatGeneration/PlanService";
import { getChatIdsQueryKey } from "../hooks/useChats";

export const useChatDeletion = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (chatId: string) => {
      await d.ChatAPI().deleteChat(chatId);
    },
    onSuccess: (_, chatId) => {
      queryClient.removeQueries({
        queryKey: getChatSettingsQueryKey(chatId),
      });
      queryClient.removeQueries({
        queryKey: getMemoriesQueryKey(chatId),
      });
      queryClient.removeQueries({
        queryKey: getPlanQueryKey(chatId),
      });
      queryClient.refetchQueries({
        queryKey: getChatIdsQueryKey(),
      });
    },
  });

  return {
    deleteChat: (chatId: string) => mutation.mutateAsync(chatId),
  };
};
