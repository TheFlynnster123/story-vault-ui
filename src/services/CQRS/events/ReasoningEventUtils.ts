import type { ReasoningCreatedEvent } from "./ChatEvent";

export class ReasoningCreatedEventUtil {
  public static Create(content: string): ReasoningCreatedEvent {
    return {
      type: "ReasoningCreated",
      messageId: this.generateMessageId(),
      content,
    };
  }

  static generateMessageId(): string {
    return `reasoning-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }
}
