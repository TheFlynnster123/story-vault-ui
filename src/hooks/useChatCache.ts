import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { ChatCache } from "../Managers/ChatCache";
import { useChatHistory } from "./queries/useChatHistory";
import type { Message } from "../pages/Chat/ChatMessage";

// Simple singleton manager
const chatCacheInstances = new Map<string, ChatCache>();

const getChatCache = (
  chatId: string,
  initialMessages: Message[] = []
): ChatCache => {
  if (!chatCacheInstances.has(chatId)) {
    chatCacheInstances.set(chatId, new ChatCache(chatId, initialMessages));
  }
  return chatCacheInstances.get(chatId)!;
};

export const useChatCache = (chatId: string | null) => {
  const queryClient = useQueryClient();
  const { data: historyData, isLoading: isLoadingHistory } =
    useChatHistory(chatId);

  // Get the singleton ChatCache instance
  const { data: chatCache } = useQuery({
    queryKey: ["chatCache", chatId],
    queryFn: () => (chatId ? getChatCache(chatId, historyData || []) : null),
    enabled: !!chatId,
    staleTime: Infinity, // Never refetch
  });

  // Simple function to trigger re-renders when cache is modified
  const invalidateCache = useCallback(() => {
    if (chatId) {
      queryClient.invalidateQueries({ queryKey: ["chatCache", chatId] });
    }
  }, [chatId, queryClient]);

  const messages = chatCache?.getMessages() || [];

  return {
    chatCache,
    messages,
    isLoadingHistory,
    invalidateCache,
  };
};
