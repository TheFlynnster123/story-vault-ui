import { d } from "../../app/Dependencies/Dependencies";
import type { Memory } from "../../models/Memory";

const MEMORIES_BLOB_NAME = "memories";

export const getMemoriesQueryKey = (chatId: string) => ["memories", chatId];

export class MemoriesService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  get = async (): Promise<Memory[]> =>
    (await d.QueryClient().ensureQueryData({
      queryKey: getMemoriesQueryKey(this.chatId),
      queryFn: async () => await this.fetchMemories(),
    })) as Memory[];

  save = async (memories: Memory[]): Promise<void> => {
    const blobContent = JSON.stringify(memories);
    await d.BlobAPI().saveBlob(this.chatId, MEMORIES_BLOB_NAME, blobContent);

    d.QueryClient().setQueryData(getMemoriesQueryKey(this.chatId), memories);
  };

  fetchMemories = async (): Promise<Memory[]> => {
    try {
      const blobContent = await d
        .BlobAPI()
        .getBlob(this.chatId, MEMORIES_BLOB_NAME);

      if (!blobContent) return [];

      return JSON.parse(blobContent) as Memory[];
    } catch (e) {
      if (e instanceof Error && e.message.includes("Blob not found")) return [];

      d.ErrorService().log("Failed to fetch memories", e);
      return [];
    }
  };
}
