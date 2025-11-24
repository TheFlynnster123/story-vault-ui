import type { LLMMessage } from "../cqrs/LLMChatProjection";

export function toUserMessage(userMessageText: string): LLMMessage {
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
