import { useEffect, useState } from "react";
import { getChatCacheInstance } from "../queries/chat-cache/ChatCache";
import type { Message } from "../models/ChatMessages/Messages";

export const useChatCache = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const chatCache = getChatCacheInstance(chatId);

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
    editMessage: async (messageId: string, newContent: string) =>
      await chatCache?.editMessage(messageId, newContent),
    deleteMessage: async (messageId: string) =>
      await chatCache?.deleteMessage(messageId),
    deleteMessagesAfterIndex: async (messageId: string) =>
      await chatCache?.deleteMessagesAfterIndex(messageId),
  };
};

export const useChatMessages = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const chatCache = getChatCacheInstance(chatId);

  useEffect(() => {
    if (!chatCache) return;
    return chatCache.subscribe(() => forceUpdate({}));
  }, [chatCache]);

  return chatCache?.Messages || [];
};
