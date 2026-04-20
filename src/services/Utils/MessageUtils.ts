import type { LLMMessage } from "../CQRS/LLMChatProjection";

export function toSystemMessage(systemReplyText: string): LLMMessage {
  return {
    id: `system-${Date.now()}`,
    role: "system",
    content: systemReplyText,
  };
}

export function toUserMessage(text: string): LLMMessage {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content: text,
  };
}
