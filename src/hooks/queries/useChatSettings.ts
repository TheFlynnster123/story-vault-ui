import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlobAPI } from "../useBlobAPI";
import type { BlobAPI } from "../../clients/BlobAPI";
import type { ChatSettings } from "../../models";

const getQueryKey = (chatId: string) => ["chat-settings", chatId];

export interface UseChatSettingsResult {
  chatSettings: ChatSettings | undefined;
  isLoading: boolean;
  saveChatSettings: (chatSettings: ChatSettings) => void;
}

export const useChatSettings = (chatId: string): UseChatSettingsResult => {
  const blobAPI = useBlobAPI();
  const saveChatSettingsMutation = useSaveChatSettingsMutation();

  const { data: chatSettings, isLoading } = useQuery({
    queryKey: getQueryKey(chatId),
    queryFn: async () => await GetChatSettings(chatId, blobAPI as BlobAPI),
    enabled: !!blobAPI && !!chatId,
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
  chatId: string,
  blobAPI: BlobAPI
): Promise<ChatSettings | undefined> => {
  const blobContent = await blobAPI.getBlob(chatId, "chat-settings");
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
  const blobAPI = useBlobAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      chatSettings: settings,
    }: SaveChatSettingsRequest) => {
      if (!blobAPI) throw new Error("BlobAPI not available");
      const content = JSON.stringify(settings);
      await blobAPI.saveBlob(chatId, "chat-settings", content);
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({
        queryKey: getQueryKey(chatId),
      });
    },
  });
};
