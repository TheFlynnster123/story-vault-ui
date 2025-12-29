import type { MessageEditedEvent } from "./ChatEvent";

export class MessageEditedEventUtil {
  public static Create(
    messageId: string,
    newContent: string
  ): MessageEditedEvent {
    return {
      type: "MessageEdited",
      messageId,
      newContent,
    };
  }
}
