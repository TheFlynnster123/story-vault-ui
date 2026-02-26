import { createGlobalManagedBlob } from "../../../../services/Blob/ManagedBlob";

export interface RecentChatsData {
  [chatId: string]: number;
}

export const getRecentChatsManagedBlobInstance =
  createGlobalManagedBlob<RecentChatsData>("recent-chats.json");
