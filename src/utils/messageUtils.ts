import type { LLMMessage } from "../cqrs/LLMChatProjection";

export function toSystemMessage(systemReplyText: string): LLMMessage {
  return {
    id: `system-${Date.now()}`,
    role: "system",
    content: systemReplyText,
  };
}
