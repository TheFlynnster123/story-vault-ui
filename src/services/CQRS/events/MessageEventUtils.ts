import type {
  AssistantResponseCreatedEvent,
  UserMessageCreatedEvent,
} from "./ChatEvent";

export class UserMessageCreatedEventUtil {
  public static Create(content: string): UserMessageCreatedEvent {
    return {
      type: "UserMessageCreated",
      messageId: generateMessageId("user"),
      content,
    };
  }
}

export class AssistantResponseCreatedEventUtil {
  public static Create(content: string): AssistantResponseCreatedEvent {
    return {
      type: "AssistantResponseCreated",
      messageId: generateMessageId("assistant"),
      content,
    };
  }
}

const generateMessageId = (author: "user" | "assistant"): string =>
  `${author}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
