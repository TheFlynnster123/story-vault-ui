import { useMutation, useQueryClient } from "@tanstack/react-query";
import { d } from "../../services/Dependencies";
import { getChatIdsQueryKey } from "../ChatMenuList/useChats";

export const useChatDeletion = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (chatId: string) => {
      await d.ChatAPI().deleteChat(chatId);
    },
    onSuccess: (_, chatId) => {
      // Clear managed blob instances
      d.ChatSettingsService(chatId).delete();
      d.MemoriesManagedBlob(chatId).delete();
      d.PlansManagedBlob(chatId).delete();

      // Refresh chat list
      queryClient.refetchQueries({
        queryKey: getChatIdsQueryKey(),
      });
    },
  });

  return {
    deleteChat: (chatId: string) => mutation.mutateAsync(chatId),
  };
};
