import type { EditMessageContent, Message } from "./Messages";

export class EditMessageUtil {
  public static parse(message: Message): EditMessageContent | null {
    try {
      const content = JSON.parse(message.content) as EditMessageContent;
      return this.isValidContent(content) ? content : null;
    } catch {
      return null;
    }
  }

  public static create(messageId: string, newContent: string): Message {
    const content: EditMessageContent = { messageId, newContent };
    return {
      id: this.generateId(),
      role: "edit",
      content: JSON.stringify(content),
    };
  }

  private static isValidContent(content: any): content is EditMessageContent {
    return (
      typeof content?.messageId === "string" &&
      typeof content?.newContent === "string"
    );
  }

  private static generateId(): string {
    return `edit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
