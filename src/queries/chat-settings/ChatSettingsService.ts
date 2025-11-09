import { d } from "../../app/Dependencies/Dependencies";
import type { ChatSettings } from "../../models";

const CHAT_SETTINGS_BLOB_NAME = "chat-settings";

export const getChatSettingsQueryKey = (chatId: string) => [
  "chat-settings",
  chatId,
];

export class ChatSettingsService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  get = async (): Promise<ChatSettings> =>
    (await d.QueryClient().ensureQueryData({
      queryKey: getChatSettingsQueryKey(this.chatId),
      queryFn: async () => await this.fetchChatSettings(),
      revalidateIfStale: false,
    })) as ChatSettings;

  save = async (chatSettings: ChatSettings): Promise<void> => {
    const blobContent = JSON.stringify(chatSettings);
    await d
      .BlobAPI()
      .saveBlob(this.chatId, CHAT_SETTINGS_BLOB_NAME, blobContent);
  };

  delete = async (): Promise<void> => {
    await d.BlobAPI().deleteBlob(this.chatId, CHAT_SETTINGS_BLOB_NAME);
  };

  fetchChatSettings = async (): Promise<ChatSettings | undefined> => {
    try {
      const blobContent = await d
        .BlobAPI()
        .getBlob(this.chatId, CHAT_SETTINGS_BLOB_NAME);

      if (!blobContent) return undefined;

      return JSON.parse(blobContent) as ChatSettings;
    } catch (e) {
      // If blob doesn't exist (404), return undefined
      if (e instanceof Error && e.message.includes("Blob not found")) {
        return undefined;
      }

      // For other errors, log and return undefined
      d.ErrorService().log("Failed to fetch chat settings", e);
      return undefined;
    }
  };
}
