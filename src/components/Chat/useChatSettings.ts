import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { d } from "../../services/Dependencies";
import { getChatSettingsQueryKey } from "../../services/Chat/ChatSettingsService";
import { getChatIdsQueryKey } from "../ChatMenuList/useChats";
import { useCivitJob } from "../Images/hooks/useCivitJob";
import type { ChatSettings } from "../../services/Chat/ChatSettings";

interface UseChatSettingsResult {
  chatSettings: ChatSettings | undefined;
  /** Resolved background photo - from CivitJob if present, otherwise from settings */
  backgroundPhotoBase64: string | undefined;
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

  const { photoBase64: civitJobPhoto } = useCivitJob(
    chatId,
    chatSettings?.backgroundPhotoCivitJobId || ""
  );

  const backgroundPhotoBase64 =
    civitJobPhoto || chatSettings?.backgroundPhotoBase64;

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
    backgroundPhotoBase64,
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
