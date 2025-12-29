import type { MessageDeletedEvent } from "./ChatEvent";

export class MessageDeletedEventUtil {
  public static Create(messageId: string): MessageDeletedEvent {
    return {
      type: "MessageDeleted",
      messageId,
    };
  }
}
