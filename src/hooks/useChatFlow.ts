import { useEffect } from "react";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useBlobAPI } from "./useBlobAPI";
import { useChatHistoryApi } from "./useChatHistoryAPI";
import { useChatFlowStore } from "../stores/chatFlowStore";
import type { ChatPage } from "../models";
import { toSystemMessage } from "../utils/messageUtils";
import { useChatSettingsQuery } from "./queries/useChatSettingsQuery";

interface UseChatFlowReturn {
  pages: ChatPage[];
  isGeneratingPlanningNotes: boolean;
  isGeneratingResponse: boolean;
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
  const chatHistoryAPI = useChatHistoryApi();

  const chatSettings = useChatSettingsQuery(chatId);

  // Zustand store - now the single source of truth
  const {
    pages,
    messages,
    isLoadingHistory,
    isGeneratingPlanningNotes,
    isGeneratingResponse,
    initialize,
    addMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    startMessageFlow,
    reset,
  } = useChatFlowStore();

  // Initialize the store when dependencies are available
  useEffect(() => {
    if (grokChatApiClient && blobAPI && chatHistoryAPI && chatId) {
      initialize(chatId, grokChatApiClient, blobAPI, chatHistoryAPI);
    }
  }, [grokChatApiClient, blobAPI, chatHistoryAPI, chatId, initialize]);

  useEffect(() => {
    const addContextMessage = async () => {
      if (!blobAPI || !chatId || isLoadingHistory) return;

      if (messages.length > 0 && chatSettings && chatSettings.context.trim())
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
  }, [
    chatSettings,
    isLoadingHistory,
    messages.length,
    addMessage,
    blobAPI,
    chatId,
  ]);

  const submitMessage = async (userMessageText: string): Promise<void> => {
    if (!grokChatApiClient || !blobAPI) {
      console.error("Grok API client or Blob API not available.");
      return;
    }

    startMessageFlow(userMessageText);
  };

  return {
    pages,
    isGeneratingPlanningNotes,
    isGeneratingResponse,
    isSendingMessage: isGeneratingPlanningNotes || isGeneratingResponse,
    submitMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
    reset,
  };
};
