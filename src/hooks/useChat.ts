import { useAuth0 } from "@auth0/auth0-react";
import type { ChatPage } from "../models/ChatPage";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import type { Message } from "../Chat/ChatMessage";
import { useCallback, useState } from "react";

interface UseChatReturn {
  pages: ChatPage[];
  isSendingMessage: boolean;
  submitMessage: (messageText: string) => Promise<void>;
  isLoadingHistory: boolean;
}

interface UseChatProps {
  chatId: string;
}

export const useChat = ({ chatId }: UseChatProps): UseChatReturn => {
  const { grokChatApiClient } = useGrokChatAPI();
  const { getAccessTokenSilently } = useAuth0();

  const { pages, addMessage, isLoadingHistory, getMessageList } = useChatPages({
    chatId,
    getAccessTokenSilently,
  });

  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  const submitMessage = useCallback(
    async (userMessageText: string) => {
      if (!chatId || !grokChatApiClient) {
        console.error("ChatId or Grok API client not available.");
        return;
      }

      setIsSendingMessage(true);

      try {
        await addMessage(toUserMessage(userMessageText));

        const systemReplyText = await grokChatApiClient.postChat(
          getMessageList()
        );

        await addMessage(toSystemMessage(systemReplyText));
      } catch (error) {
        console.error("Error during message submission or Grok call:", error);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [chatId, grokChatApiClient, addMessage, getMessageList]
  );

  return {
    pages,
    isSendingMessage,
    submitMessage,
    isLoadingHistory,
  };
};

function toUserMessage(userMessageText: string): Message {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    content: userMessageText,
  };
}

function toSystemMessage(systemReplyText: string): Message {
  return {
    id: `system-${Date.now()}`,
    role: "system",
    content: systemReplyText,
  };
}
