import { d } from "../../app/Dependencies/Dependencies";
import { DeleteMessageUtil } from "../../models/ChatMessages/DeleteMessageUtil";
import { type Message } from "../../models/ChatMessages/Messages";
import { ChatHistoryReducer } from "./ChatHistoryReducer";

// Singleton instances
const chatCacheInstances = new Map<string, ChatCache>();

export const getChatCacheInstance = (
  chatId: string | null
): ChatCache | null => {
  if (!chatId) return null;

  if (!chatCacheInstances.has(chatId))
    chatCacheInstances.set(chatId, new ChatCache(chatId));

  return chatCacheInstances.get(chatId)!;
};

export class ChatCache {
  public Messages: Message[];
  public IsLoading: boolean = false;

  private chatId: string;
  private initialized: boolean = false;
  private subscribers = new Set<() => void>();

  public constructor(chatId: string, messages?: Message[]) {
    this.Messages = messages || [];
    this.chatId = chatId;

    this.initializeMessagesIfNeeded();
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  private async initializeMessagesIfNeeded(): Promise<void> {
    if (!this.initialized) {
      await this.withLoading(() => this.initializeMessages());
      this.initialized = true;
    }
  }

  public async initializeMessages(): Promise<void> {
    const rawChatHistory = await this.withLoading(() =>
      d.ChatHistoryApi().getChatHistory(this.chatId)
    );

    this.Messages = ChatHistoryReducer.reduce(rawChatHistory);
    this.notifySubscribers();
  }

  public getMessages(): Message[] {
    return this.Messages;
  }

  public async addMessage(message: Message): Promise<void> {
    this.Messages.push(message);
    this.notifySubscribers();

    await this.withLoading(() =>
      d.ChatHistoryApi().addChatMessage(this.chatId, message)
    );
  }

  public getMessagesForLLM(): Message[] {
    return this.Messages.filter((msg) => msg.role !== "civit-job");
  }

  public getMessage(messageId: string): Message | null {
    return this.Messages.find((msg) => msg.id === messageId) || null;
  }

  public async deleteMessage(messageId: string): Promise<void> {
    this.applyLocalDeletion(messageId);
    this.notifySubscribers();

    const deleteCommand = DeleteMessageUtil.create(messageId);
    await this.withLoading(() =>
      d.ChatHistoryApi().addChatMessage(this.chatId, deleteCommand)
    );
  }

  public async deleteMessagesAfterIndex(messageId: string): Promise<void> {
    const messageIdsToDelete = this.getMessageIdsAfterIndex(messageId);

    this.applyLocalDeletionFromIndex(messageId);
    this.notifySubscribers();

    const deleteCommands = this.createDeleteCommands(messageIdsToDelete);

    await this.withLoading(() =>
      d.ChatHistoryApi().addChatMessages(this.chatId, deleteCommands)
    );
  }

  public getDeletePreview(messageId: string): { messageCount: number } {
    const index = this.Messages.findIndex((msg) => msg.id === messageId);

    if (index === -1) {
      return { messageCount: 0 };
    }

    return { messageCount: this.Messages.length - index };
  }

  public getChatId(): string {
    return this.chatId;
  }

  private getMessageIdsAfterIndex(messageId: string): string[] {
    const index = this.Messages.findIndex((msg) => msg.id === messageId);
    if (index === -1) {
      return [];
    }

    return this.Messages.slice(index).map((msg) => msg.id);
  }

  private createDeleteCommands(messageIds: string[]): Message[] {
    return messageIds.map((messageId) => DeleteMessageUtil.create(messageId));
  }

  private applyLocalDeletion(messageId: string): void {
    const index = this.Messages.findIndex((msg) => msg.id === messageId);
    if (index !== -1) {
      this.Messages.splice(index, 1);
    }
  }

  private applyLocalDeletionFromIndex(messageId: string): void {
    const index = this.Messages.findIndex((msg) => msg.id === messageId);
    if (index !== -1) {
      this.Messages.splice(index);
    }
  }

  async withLoading(func: () => Promise<any>) {
    this.IsLoading = true;

    try {
      return await func();
    } finally {
      this.IsLoading = false;
    }
  }
}
