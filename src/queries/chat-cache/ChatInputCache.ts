// Singleton instances for chat input cache
const chatInputCacheInstances = new Map<string, ChatInputCache>();

export const getChatInputCacheInstance = (
  chatId: string | null
): ChatInputCache | null => {
  if (!chatId) return null;

  if (!chatInputCacheInstances.has(chatId))
    chatInputCacheInstances.set(chatId, new ChatInputCache(chatId));

  return chatInputCacheInstances.get(chatId)!;
};

export class ChatInputCache {
  private inputValue: string = "";
  private chatId: string;
  private subscribers = new Set<() => void>();

  public constructor(chatId: string) {
    this.chatId = chatId;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  public getInputValue(): string {
    return this.inputValue;
  }

  public setInputValue(value: string): void {
    this.inputValue = value;
    this.notifySubscribers();
  }

  public clearInputValue(): void {
    this.inputValue = "";
    this.notifySubscribers();
  }

  public getChatId(): string {
    return this.chatId;
  }
}
