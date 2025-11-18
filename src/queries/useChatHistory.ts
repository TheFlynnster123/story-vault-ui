import { useQuery } from "@tanstack/react-query";
import { d } from "../app/Dependencies/Dependencies";
import type { Message } from "../models/ChatMessages/Messages";

export const useChatHistory = (chatId: string | null) => {
  return useQuery<Message[]>({
    queryKey: ["chatHistory", chatId],
    queryFn: () => d.ChatHistoryApi().getChatHistory(chatId!), // Use singleton instance
    enabled: !!chatId,
    staleTime: 5 * 60 * 1000, // 5 minutes - treat data as fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch when network reconnects
  });
};
