import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getChatIdsQueryKey } from "../ChatMenuList/useChats";
import { d } from "../../services/Dependencies";
import type { ChatSettings } from "../../services/Chat/ChatSettings";

interface CreateChatParams {
  chatId: string;
  settings: ChatSettings;
  story: string;
}

/**
 * Custom hook for creating a chat with automatic cache invalidation.
 *
 * This hook handles the complete chat creation flow: saving settings,
 * initializing the story, recording navigation, and invalidating the
 * chat list cache to ensure the UI updates immediately.
 *
 * @example
 * const { createChat, isCreating } = useCreateChat();
 *
 * await createChat({
 *   chatId,
 *   settings: { chatTitle: "My Chat", ... },
 *   story: "Once upon a time..."
 * });
 */
export const useCreateChat = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ chatId, settings, story }: CreateChatParams) => {
      await d.ChatSettingsService(chatId).save(settings);
      await d.ChatService(chatId).InitializeStory(story);
      await d.RecentChatsService().recordNavigation(chatId);
    },
    onSuccess: () => {
      // Refresh chat list to show the newly created chat
      queryClient.refetchQueries({
        queryKey: getChatIdsQueryKey(),
      });
    },
  });

  return {
    createChat: (params: CreateChatParams) => mutation.mutateAsync(params),
    isCreating: mutation.isPending,
  };
};
