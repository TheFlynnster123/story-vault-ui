import { useEffect } from "react";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useBlobAPI } from "./useBlobAPI";
import { useChatHistoryApi } from "./useChatHistoryAPI";
import { useChatFlowStore } from "../stores/chatFlowStore";
import type { ChatPage } from "../models";
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
    isLoadingHistory,
    isGeneratingPlanningNotes,
    isGeneratingResponse,
    initialize,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    startMessageFlow,
    reset,
  } = useChatFlowStore();

  // Initialize the store when dependencies are available
  useEffect(() => {
    if (
      grokChatApiClient &&
      blobAPI &&
      chatHistoryAPI &&
      chatId &&
      chatSettings
    ) {
      initialize(
        chatId,
        grokChatApiClient,
        blobAPI,
        chatHistoryAPI,
        chatSettings.context
      );
    }
  }, [
    grokChatApiClient,
    blobAPI,
    chatHistoryAPI,
    chatId,
    initialize,
    chatSettings,
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
