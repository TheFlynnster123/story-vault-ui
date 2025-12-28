import { useMutation, useQueryClient } from "@tanstack/react-query";
import { d } from "../../services/Dependencies";
import { getChatSettingsQueryKey } from "../../services/Chat/ChatSettingsService";
import { getPlanQueryKey } from "../../services/ChatGeneration/PlanService";
import { getChatIdsQueryKey } from "../ChatMenuList/useChats";
import { getMemoriesQueryKey } from "../../services/ChatGeneration/MemoriesService";

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
