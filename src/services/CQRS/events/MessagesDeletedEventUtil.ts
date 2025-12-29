import type { MessagesDeletedEvent } from "./ChatEvent";

export class MessagesDeletedEventUtil {
  public static Create(messageIds: string[]): MessagesDeletedEvent {
    return {
      type: "MessagesDeleted",
      messageIds: messageIds,
    };
  }
}
