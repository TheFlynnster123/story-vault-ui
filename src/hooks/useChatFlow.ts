import { useEffect } from "react";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useBlobAPI } from "./useBlobAPI";
import { useChatHistoryApi } from "./useChatHistoryAPI";
import { useChatFlowStore } from "../stores/chatFlowStore";
import type { ChatPage } from "../models";
import { useChatSettings } from "./queries/useChatSettings";

interface UseChatFlowReturn {
  pages: ChatPage[];
  isGeneratingPlanningNotes: boolean;
  isGeneratingResponse: boolean;
  isSendingMessage: boolean;
  submitMessage: (messageText: string) => void;
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

  const { chatSettings } = useChatSettings(chatId);

  const {
    pages,
    isLoadingHistory,
    isGeneratingPlanningNotes,
    isGeneratingResponse,
    initialize,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    submitMessage,
    reset,
  } = useChatFlowStore();

  useEffect(() => {
    if (
      grokChatApiClient &&
      blobAPI &&
      chatHistoryAPI &&
      chatId &&
      chatSettings
    ) {
      initialize(chatId, grokChatApiClient, blobAPI, chatHistoryAPI);
    }
  }, [
    grokChatApiClient,
    blobAPI,
    chatHistoryAPI,
    chatId,
    initialize,
    chatSettings,
  ]);

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
