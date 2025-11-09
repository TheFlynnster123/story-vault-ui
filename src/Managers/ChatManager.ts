import type { Message } from "../pages/Chat/ChatMessage";

export class ChatManager {
  private messages: Message[];
  private chatId: string;

  public constructor(chatId: string, messages?: Message[]) {
    this.messages = messages || [];
    this.chatId = chatId;
  }

  public addMessage(message: Message): void {
    this.messages.push(message);
  }

  public getMessageList(): Message[] {
    return this.messages.filter((msg) => msg.role !== "civit-job");
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public getMessage(messageId: string): Message | null {
    return this.messages.find((msg) => msg.id === messageId) || null;
  }

  public deleteMessage(messageId: string): void {
    const index = this.messages.findIndex((msg) => msg.id === messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
    }
  }

  public deleteMessagesAfterIndex(messageId: string): void {
    const index = this.messages.findIndex((msg) => msg.id === messageId);
    if (index !== -1) {
      this.messages.splice(index);
    }
  }

  public getDeletePreview(messageId: string): { messageCount: number } {
    const index = this.messages.findIndex((msg) => msg.id === messageId);
    if (index === -1) {
      return { messageCount: 0 };
    }
    return { messageCount: this.messages.length - index };
  }

  public getDeleteFromHerePreview(messageId: string): { messageCount: number } {
    return this.getDeletePreview(messageId);
  }

  public getChatId(): string {
    return this.chatId;
  }
}
