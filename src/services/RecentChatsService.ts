import { d } from "../app/Dependencies/Dependencies";

const RECENT_CHATS_BLOB_NAME = "recent-chats.json";

interface RecentChatsData {
  [chatId: string]: number;
}

let instance: RecentChatsService | null = null;

export const getRecentChatsServiceInstance = (): RecentChatsService => {
  if (!instance) instance = new RecentChatsService();

  return instance;
};

export class RecentChatsService {
  private recentChats: RecentChatsData | null = null;
  private loadPromise: Promise<RecentChatsData> | null = null;

  async load(): Promise<RecentChatsData> {
    if (this.isLoaded()) {
      return this.recentChats!;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadFromBlob();
    this.recentChats = await this.loadPromise;
    this.loadPromise = null;
    return this.recentChats;
  }

  async recordNavigation(chatId: string): Promise<void> {
    await this.load();
    this.recentChats![chatId] = Date.now();
    this.saveToBlob();
  }

  async sortByRecency(chatIds: string[]): Promise<string[]> {
    await this.load();
    return [...chatIds].sort(this.compareByRecency);
  }

  getLastNavigationTime(chatId: string): number | null {
    return this.recentChats?.[chatId] ?? null;
  }

  isLoaded(): boolean {
    return this.recentChats !== null;
  }

  private compareByRecency = (a: string, b: string): number => {
    const timeA = this.recentChats![a] ?? 0;
    const timeB = this.recentChats![b] ?? 0;
    return timeB - timeA;
  };

  private async loadFromBlob(): Promise<RecentChatsData> {
    try {
      const content = await d
        .BlobAPI()
        .getBlob(d.BlobAPI().GLOBAL_CHAT_ID, RECENT_CHATS_BLOB_NAME);
      return content ? parseRecentChatsData(content) : {};
    } catch (error: any) {
      return handleLoadError(error);
    }
  }

  private async saveToBlob(): Promise<void> {
    if (!this.recentChats) {
      return;
    }
    try {
      await d
        .BlobAPI()
        .saveBlob(
          d.BlobAPI().GLOBAL_CHAT_ID,
          RECENT_CHATS_BLOB_NAME,
          JSON.stringify(this.recentChats)
        );
    } catch (error) {
      console.error("Failed to save recent chats:", error);
    }
  }
}

const parseRecentChatsData = (content: string): RecentChatsData =>
  JSON.parse(content) as RecentChatsData;

const handleLoadError = (error: any): RecentChatsData => {
  if (isBlobNotFoundError(error)) {
    return {};
  }
  console.error("Failed to load recent chats:", error);
  return {};
};

const isBlobNotFoundError = (error: any): boolean =>
  error?.message?.includes("not found");
