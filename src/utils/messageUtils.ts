import type { LLMMessage } from "../cqrs/LLMChatProjection";
import type { Message } from "../models/ChatMessages/Messages";

export function toUserMessage(userMessageText: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content: userMessageText,
  };
}

export function toSystemMessage(systemReplyText: string): LLMMessage {
  return {
    id: `system-${Date.now()}`,
    role: "system",
    content: systemReplyText,
  };
}
