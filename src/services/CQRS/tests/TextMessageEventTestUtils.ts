import type {
  AssistantResponseCreatedEvent,
  InstructionCreatedEvent,
  TextMessageCreatedEvent,
  UserMessageCreatedEvent,
} from "../events/ChatEvent";

export type TextMessageAuthor = "user" | "assistant" | "system";

export const createTextMessageEvent = (
  messageId: string,
  author: TextMessageAuthor,
  content: string,
): TextMessageCreatedEvent => {
  switch (author) {
    case "user":
      return createUserMessageEvent(messageId, content);
    case "assistant":
      return createAssistantResponseEvent(messageId, content);
    case "system":
      return createInstructionEvent(messageId, content);
  }
};

export const createGeneratedTextMessageEvent = (
  author: TextMessageAuthor,
  content: string,
): TextMessageCreatedEvent =>
  createTextMessageEvent(
    `${author}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    author,
    content,
  );

export const createUserMessageEvent = (
  messageId: string,
  content: string,
): UserMessageCreatedEvent => ({
  type: "UserMessageCreated",
  messageId,
  content,
});

export const createAssistantResponseEvent = (
  messageId: string,
  content: string,
): AssistantResponseCreatedEvent => ({
  type: "AssistantResponseCreated",
  messageId,
  content,
});

export const createInstructionEvent = (
  messageId: string,
  content: string,
): InstructionCreatedEvent => ({
  type: "InstructionCreated",
  messageId,
  content,
});
