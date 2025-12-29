import { d } from "../Dependencies";

let instance: RecentChatsService | null = null;

export const getRecentChatsServiceInstance = (): RecentChatsService => {
  if (!instance) instance = new RecentChatsService();

  return instance;
};

export class RecentChatsService {
  async recordNavigation(chatId: string): Promise<void> {
    const recentChats = (await d.RecentChatsManagedBlob().get()) ?? {};

    recentChats[chatId] = Date.now();
    await d.RecentChatsManagedBlob().saveDebounced(recentChats);
  }

  async sortByRecency(chatIds: string[]): Promise<string[]> {
    const recentChats = (await d.RecentChatsManagedBlob().get()) ?? {};

    return [...chatIds].sort((a, b) => {
      const timeA = recentChats[a] ?? 0;
      const timeB = recentChats[b] ?? 0;
      return timeB - timeA;
    });
  }

  async getLastNavigationTime(_chatId: string): Promise<number | null> {
    const recentChats = (await d.RecentChatsManagedBlob().get()) ?? {};

    return recentChats[_chatId] ?? null;
  }

  isLoading(): boolean {
    return d.RecentChatsManagedBlob().isLoading();
  }
}
