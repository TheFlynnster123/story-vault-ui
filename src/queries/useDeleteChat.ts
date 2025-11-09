import { useMutation, useQueryClient } from "@tanstack/react-query";
import { d } from "../app/Dependencies/Dependencies";
import { getChatSettingsQueryKey } from "./chat-settings/ChatSettingsService";
import { getMemoriesQueryKey } from "./memories/MemoriesService";
import { getNotesQueryKey } from "./notes/NotesService";
import { getChatIdsQueryKey } from "../hooks/useChats";

export const useChatDeletion = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (chatId: string) => {
      await d.ChatHistoryApi().deleteChat(chatId);
    },
    onSuccess: (_, chatId) => {
      queryClient.removeQueries({
        queryKey: getChatSettingsQueryKey(chatId),
      });
      queryClient.removeQueries({
        queryKey: getMemoriesQueryKey(chatId),
      });
      queryClient.removeQueries({
        queryKey: getNotesQueryKey(chatId),
      });

      queryClient.invalidateQueries({
        queryKey: getChatIdsQueryKey(),
      });
    },
  });

  return {
    deleteChat: (chatId: string) => mutation.mutateAsync(chatId),
  };
};
