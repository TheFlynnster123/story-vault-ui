import { useAuth0 } from "@auth0/auth0-react";
import type { ChatPage } from "../models/ChatPage";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import type { Message } from "../Chat/ChatMessage";
import { useCallback, useState } from "react";

const MAX_MESSAGES_PER_PAGE = 20;

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

  const { pages, addMessageExchangeToPages, isLoadingHistory } = useChatPages({
    chatId,
    getAccessTokenSilently,
    maxMessagesPerPage: MAX_MESSAGES_PER_PAGE,
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
        const userMessage = toUserMessage(userMessageText);

        const allMessages: Message[] = pages.reduce((acc: Message[], page) => {
          return acc.concat(page.messages);
        }, [] as Message[]);
        allMessages.push(userMessage);

        const systemReplyText = await grokChatApiClient.postChat(allMessages);

        const systemMessage = toSystemMessage(systemReplyText);

        await addMessageExchangeToPages(userMessage, systemMessage);
      } catch (error) {
        console.error("Error during message submission or Grok call:", error);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [chatId, grokChatApiClient, addMessageExchangeToPages]
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
