import type { MessageCreatedEvent } from "./ChatEvent";

export class MessageCreatedEventUtil {
  public static Create(
    role: "user" | "system" | "assistant",
    content: string
  ): MessageCreatedEvent {
    return {
      type: "MessageCreated",
      messageId: this.generateMessageId(role),
      role: role,
      content,
    };
  }

  static generateMessageId(role: string): string {
    return `${role}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }
}
