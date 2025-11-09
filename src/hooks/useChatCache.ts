import { useEffect, useState } from "react";
import { ChatCache } from "../Managers/ChatCache";
import type { Message } from "../pages/Chat/ChatMessage";

// Singleton instances
const chatCacheInstances = new Map<string, ChatCache>();

const getChatCache = (chatId: string | null): ChatCache | null => {
  if (!chatId) return null;

  if (!chatCacheInstances.has(chatId))
    chatCacheInstances.set(chatId, new ChatCache(chatId));

  return chatCacheInstances.get(chatId)!;
};

export const useChatCache = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const chatCache = getChatCache(chatId);

  useEffect(() => {
    if (!chatCache) return;
    return chatCache.subscribe(() => forceUpdate({}));
  }, [chatCache]);

  return {
    chatCache,
    messages: chatCache?.Messages || [],
    isLoading: chatCache?.IsLoading || false,
    getMessagesForLLM: () => chatCache?.getMessagesForLLM() || [],
    getMessage: (messageId: string) => chatCache?.getMessage(messageId) || null,
    getDeletePreview: (messageId: string) =>
      chatCache?.getDeletePreview(messageId) || { messageCount: 0 },
    addMessage: async (message: Message) =>
      await chatCache?.addMessage(message),
    deleteMessage: async (messageId: string) =>
      await chatCache?.deleteMessage(messageId),
    deleteMessagesAfterIndex: async (messageId: string) =>
      await chatCache?.deleteMessagesAfterIndex(messageId),
  };
};

export const useChatMessages = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const chatCache = getChatCache(chatId);

  useEffect(() => {
    if (!chatCache) return;
    return chatCache.subscribe(() => forceUpdate({}));
  }, [chatCache]);

  return chatCache?.Messages || [];
};
