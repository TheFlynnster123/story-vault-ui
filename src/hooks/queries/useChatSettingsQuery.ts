import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlobAPI } from "../useBlobAPI";
import type { BlobAPI } from "../../clients/BlobAPI";
import type { ChatSettings } from "../../models";

export const getChatSettingsQueryKey = (chatId: string) => [
  "chat-settings",
  chatId,
];

export const GetChatSettings = async (
  chatId: string,
  blobAPI: BlobAPI
): Promise<ChatSettings | undefined> => {
  const blobContent = await blobAPI.getBlob(chatId, "chat-settings");
  if (!blobContent) {
    return undefined;
  }

  try {
    return JSON.parse(blobContent) as ChatSettings;
  } catch (error) {
    console.error("Failed to parse chat settings:", error);
    return undefined;
  }
};

export const useChatSettingsQuery = (
  chatId: string
): ChatSettings | undefined => {
  const blobAPI = useBlobAPI();

  const { data: chatSettings } = useQuery({
    queryKey: getChatSettingsQueryKey(chatId),
    queryFn: async () => await GetChatSettings(chatId, blobAPI as BlobAPI),
    enabled: !!blobAPI && !!chatId,
  });

  return chatSettings;
};

export const useUpdateChatSettingsMutation = () => {
  const blobAPI = useBlobAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      settings,
    }: {
      chatId: string;
      settings: ChatSettings;
    }) => {
      if (!blobAPI) throw new Error("BlobAPI not available");
      const content = JSON.stringify(settings);
      await blobAPI.saveBlob(chatId, "chat-settings", content);
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({
        queryKey: getChatSettingsQueryKey(chatId),
      });
    },
  });
};

export const useCreateChatSettingsMutation = () => {
  const blobAPI = useBlobAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chatId,
      settings,
    }: {
      chatId: string;
      settings: ChatSettings;
    }) => {
      if (!blobAPI) throw new Error("BlobAPI not available");
      const content = JSON.stringify(settings);
      await blobAPI.saveBlob(chatId, "chat-settings", content);
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({
        queryKey: getChatSettingsQueryKey(chatId),
      });
    },
  });
};
