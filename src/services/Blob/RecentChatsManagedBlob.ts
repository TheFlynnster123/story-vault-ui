import { ManagedBlob } from "./ManagedBlob";

const RECENT_CHATS_BLOB_NAME = "recent-chats.json";
const GLOBAL_CHAT_ID = "global";

export interface RecentChatsData {
  [chatId: string]: number;
}

// Singleton instance (global blob)
let instance: RecentChatsManagedBlob | null = null;

export const getRecentChatsManagedBlobInstance = (): RecentChatsManagedBlob => {
  if (!instance) {
    instance = new RecentChatsManagedBlob();
  }
  return instance;
};

export class RecentChatsManagedBlob extends ManagedBlob<RecentChatsData> {
  constructor() {
    super(GLOBAL_CHAT_ID);
  }

  protected getBlobName(): string {
    return RECENT_CHATS_BLOB_NAME;
  }
}
