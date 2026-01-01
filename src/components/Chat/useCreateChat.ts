import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getChatIdsQueryKey } from "../ChatMenuList/useChats";

export const useCreateChat = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (createChatFn: () => Promise<void>) => {
      await createChatFn();
    },
    onSuccess: () => {
      // Refresh chat list
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
