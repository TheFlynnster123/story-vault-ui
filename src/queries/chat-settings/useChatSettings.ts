import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChatSettings } from "../../models";
import { d } from "../../app/Dependencies/Dependencies";
import { getChatSettingsQueryKey } from "./ChatSettingsService";
import { getChatIdsQueryKey } from "../../hooks/useChats";

interface UseChatSettingsResult {
  chatSettings: ChatSettings | undefined;
  isLoading: boolean;
  saveChatSettings: (chatSettings: ChatSettings) => void;
}

export const useChatSettings = (
  chatId: string,
  isNew: boolean = false
): UseChatSettingsResult => {
  const queryClient = useQueryClient();

  const { data: chatSettings, isLoading } = useQuery({
    enabled: !!chatId && !isNew,
    queryKey: getChatSettingsQueryKey(chatId),
    queryFn: async () => {
      return await d.ChatSettingsService(chatId).fetchChatSettings();
    },
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const saveChatSettingsMutation = useMutation({
    mutationFn: async ({ chatSettings: settings }: SaveChatSettingsRequest) => {
      await d.ChatSettingsService(chatId).save(settings);
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(
        getChatSettingsQueryKey(chatId),
        variables.chatSettings
      );
      queryClient.refetchQueries({
        queryKey: getChatIdsQueryKey(),
      });
    },
  });

  return {
    chatSettings,
    isLoading,
    saveChatSettings: (chatSettings) =>
      saveChatSettingsMutation.mutateAsync({
        chatSettings,
      }),
  };
};

interface SaveChatSettingsRequest {
  chatSettings: ChatSettings;
}
