import { useQuery } from "@tanstack/react-query";
import type { ChatPage } from "../../models/ChatPage";
import { ChatHistoryAPI } from "../../clients/ChatHistoryAPI";

export const useChatHistory = (chatId: string | null) => {
  return useQuery<ChatPage[]>({
    queryKey: ["chatHistory", chatId],
    queryFn: () => new ChatHistoryAPI().getChatHistory(chatId!),
    enabled: !!chatId,
  });
};
