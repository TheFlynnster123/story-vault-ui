import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlobAPI } from "../../clients/BlobAPI";
import type { ChatSettings } from "../../models";

const getQueryKey = (chatId: string) => ["chat-settings", chatId];

export interface UseChatSettingsResult {
  chatSettings: ChatSettings | undefined;
  isLoading: boolean;
  saveChatSettings: (chatSettings: ChatSettings) => void;
}

export const useChatSettings = (chatId: string): UseChatSettingsResult => {
  const saveChatSettingsMutation = useSaveChatSettingsMutation();

  const { data: chatSettings, isLoading } = useQuery({
    queryKey: getQueryKey(chatId),
    queryFn: async () => await GetChatSettings(chatId),
    enabled: !!chatId,
    retry: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    chatSettings,
    isLoading,
    saveChatSettings: (chatSettings) =>
      saveChatSettingsMutation.mutateAsync({
        chatId,
        chatSettings,
      }),
  };
};

export const GetChatSettings = async (
  chatId: string
): Promise<ChatSettings | undefined> => {
  const blobContent = await new BlobAPI().getBlob(chatId, "chat-settings");
  if (!blobContent) return undefined;

  try {
    return JSON.parse(blobContent) as ChatSettings;
  } catch (error) {
    console.error("Failed to parse chat settings:", error);
    return undefined;
  }
};

interface SaveChatSettingsRequest {
  chatId: string;
  chatSettings: ChatSettings;
}

export const useSaveChatSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      chatSettings: settings,
    }: SaveChatSettingsRequest) => {
      const content = JSON.stringify(settings);
      await new BlobAPI().saveBlob(chatId, "chat-settings", content);
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({
        queryKey: ["chat-settings", chatId],
      });
    },
  });
};
