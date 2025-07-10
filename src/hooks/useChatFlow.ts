import { useEffect } from "react";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import { useBlobAPI } from "./useBlobAPI";
import { useChatFlowStore } from "../stores/chatFlowStore";
import type { ChatPage } from "../models";
import { toSystemMessage } from "../utils/messageUtils";
import { useChatSettingsQuery } from "./queries/useChatSettingsQuery";

interface UseChatFlowReturn {
  pages: ChatPage[];
  isSendingMessage: boolean;
  submitMessage: (messageText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteMessagesFromIndex: (messageId: string) => Promise<void>;
  getDeletePreview: (messageId: string) => {
    messageCount: number;
    pageCount: number;
  };
  isLoadingHistory: boolean;
  reset: () => void;
}

interface UseChatFlowProps {
  chatId: string;
}

export const useChatFlow = ({
  chatId,
}: UseChatFlowProps): UseChatFlowReturn => {
  const { grokChatApiClient } = useGrokChatAPI();
  const blobAPI = useBlobAPI();

  const chatSettings = useChatSettingsQuery(chatId);

  const {
    pages,
    addMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
    getMessageList,
  } = useChatPages({
    chatId,
  });

  // Zustand store
  const {
    isSendingMessage,
    initialize,
    submitMessage: storeSubmitMessage,
    reset,
  } = useChatFlowStore();

  // Initialize the store when dependencies are available
  useEffect(() => {
    if (grokChatApiClient && blobAPI && chatId) {
      initialize(grokChatApiClient, blobAPI, chatId);
    }
  }, [grokChatApiClient, blobAPI, chatId, initialize]);

  useEffect(() => {
    const addContextMessage = async () => {
      if (!blobAPI || !chatId || isLoadingHistory) return;

      const messageList = getMessageList();

      if (messageList.length > 0 && chatSettings && chatSettings.context.trim())
        return;

      try {
        const contextMessage = toSystemMessage(
          `Story Context: ${chatSettings!.context}`
        );

        await addMessage(contextMessage);
      } catch (error) {
        console.error("Failed to load chat settings or add context:", error);
      }
    };

    addContextMessage();
  }, [chatSettings, isLoadingHistory, getMessageList, addMessage]);

  const submitMessage = async (userMessageText: string): Promise<void> => {
    if (!grokChatApiClient || !blobAPI) {
      console.error("Grok API client or Blob API not available.");
      return;
    }

    await storeSubmitMessage(userMessageText, addMessage, getMessageList);
  };

  return {
    pages,
    isSendingMessage,
    submitMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
    reset,
  };
};
