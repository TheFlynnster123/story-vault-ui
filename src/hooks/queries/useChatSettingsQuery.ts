import { useQuery } from "@tanstack/react-query";
import { useBlobAPI } from "../useBlobAPI";
import type { BlobAPI } from "../../clients/BlobAPI";
import type { ChatSettings } from "../../models";

export const useChatSettingsQuery = (
  chatId: string
): ChatSettings | undefined => {
  const blobAPI = useBlobAPI();

  const { data: chatSettings } = useQuery({
    queryKey: ["chat-settings", chatId],
    queryFn: async () => await GetChatSettings(chatId, blobAPI as BlobAPI),
    enabled: !!blobAPI && !!chatId,
  });

  return chatSettings;
};

const GetChatSettings = async (
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
