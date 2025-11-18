import type { DeleteMessageContent, Message } from "./Messages";

export class DeleteMessageUtil {
  public static parse(message: Message): DeleteMessageContent | null {
    try {
      const content = JSON.parse(message.content) as DeleteMessageContent;
      return this.isValidContent(content) ? content : null;
    } catch {
      return null;
    }
  }

  public static create(messageIdToDelete: string): Message {
    const content: DeleteMessageContent = { messageId: messageIdToDelete };
    return {
      id: this.generateId(),
      role: "delete",
      content: JSON.stringify(content),
    };
  }

  private static isValidContent(content: any): content is DeleteMessageContent {
    return typeof content?.messageId === "string";
  }

  private static generateId(): string {
    return `delete-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
