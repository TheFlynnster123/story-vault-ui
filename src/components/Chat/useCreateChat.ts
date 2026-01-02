import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getChatIdsQueryKey } from "../ChatMenuList/useChats";

/**
 * Custom hook for creating a chat with automatic cache invalidation.
 * 
 * This hook wraps the chat creation logic in a React Query mutation that
 * automatically invalidates the chat-ids cache upon successful creation,
 * ensuring the chat list is immediately updated.
 * 
 * The hook accepts a function parameter to maintain flexibility and keep
 * the specific chat creation logic (save settings, initialize story, etc.)
 * in the component where it belongs, rather than coupling it to this hook.
 * 
 * @example
 * const { createChat, isCreating } = useCreateChat();
 * 
 * await createChat(async () => {
 *   await saveChatSettings();
 *   await initializeStory();
 * });
 */
export const useCreateChat = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (createChatFn: () => Promise<void>) => {
      await createChatFn();
    },
    onSuccess: () => {
      // Refresh chat list to show the newly created chat
      queryClient.refetchQueries({
        queryKey: getChatIdsQueryKey(),
      });
    },
  });

  return {
    createChat: (createChatFn: () => Promise<void>) =>
      mutation.mutateAsync(createChatFn),
    isCreating: mutation.isPending,
  };
};
