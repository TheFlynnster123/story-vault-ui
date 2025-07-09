import { useEffect } from "react";
import { useGrokChatAPI } from "./useGrokChatAPI";
import { useChatPages } from "./useChatPages";
import { useBlobAPI } from "./useBlobAPI";
import { useChatFlowV2Store } from "../stores/chatFlowStore";
import type { ChatPage } from "../models";
import { ChatSettingsManager } from "../Managers/ChatSettingsManager";
import { toSystemMessage } from "../utils/messageUtils";

export interface ChatFlowV2Step {
  id: string;
  stepType:
    | "planning_notes"
    | "system_message"
    | "refinement_notes"
    | "refined_message"
    | "analysis_notes";
  content: string;
  timestamp: number;
}

interface UseChatFlowV2Return {
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
  progressStatus?: string;
  chatFlowHistory: ChatFlowV2Step[];
  currentState: string;
  error?: string;
  deleteNotes: () => Promise<void>;
  reset: () => void;
}

interface UseChatFlowV2Props {
  chatId: string;
}

export const useChatFlowV2 = ({
  chatId,
}: UseChatFlowV2Props): UseChatFlowV2Return => {
  const { grokChatApiClient } = useGrokChatAPI();
  const blobAPI = useBlobAPI();

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
    currentState,
    progressStatus,
    chatFlowHistory,
    error,
    analysisNote,
    initialize,
    submitMessage: storeSubmitMessage,
    reset,
  } = useChatFlowV2Store();

  // Initialize the store when dependencies are available
  useEffect(() => {
    if (grokChatApiClient && blobAPI && chatId) {
      initialize(grokChatApiClient, blobAPI, chatId);
    }
  }, [grokChatApiClient, blobAPI, chatId, initialize]);

  // Check for chat settings and add context as first message if needed
  useEffect(() => {
    const addContextMessage = async () => {
      if (!blobAPI || !chatId || isLoadingHistory) return;

      const messageList = getMessageList();

      // Only add context if no messages exist
      if (messageList.length > 0) return;

      try {
        // Load chat settings
        const manager = new ChatSettingsManager(blobAPI);
        const settings = await manager.get(chatId);

        if (settings && settings.context.trim()) {
          // Add context as the first system message
          const contextMessage = toSystemMessage(
            `Story Context: ${settings.context}`
          );
          await addMessage(contextMessage);
        }
      } catch (error) {
        console.error("Failed to load chat settings or add context:", error);
      }
    };

    addContextMessage();
  }, [blobAPI, chatId, isLoadingHistory, getMessageList, addMessage]);

  const submitMessage = async (userMessageText: string): Promise<void> => {
    if (!grokChatApiClient || !blobAPI) {
      console.error("Grok API client or Blob API not available.");
      return;
    }

    await storeSubmitMessage(
      userMessageText,
      getMessageList(),
      addMessage,
      getMessageList
    );
  };

  const deleteNotes = async (): Promise<void> => {
    if (!blobAPI || !chatId) {
      console.error("BlobAPI or chatId not available for deletion.");
      return;
    }

    try {
      const notesToDelete = [analysisNote].filter(Boolean);

      if (notesToDelete.length === 0) {
        console.warn("No notes available for deletion.");
        return;
      }

      // Delete all notes from storage
      await Promise.all(
        notesToDelete.map((note) =>
          blobAPI.deleteBlob(chatId, note!.getNoteName())
        )
      );

      // Clear the content of each note instance locally
      notesToDelete.forEach((note) => {
        note!.setContent("");
      });

      console.log("Notes deleted successfully");
    } catch (error) {
      console.error("Failed to delete notes:", error);
      throw error;
    }
  };

  return {
    pages,
    isSendingMessage:
      currentState !== "idle" &&
      currentState !== "complete" &&
      currentState !== "error",
    submitMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
    progressStatus,
    chatFlowHistory,
    currentState,
    error,
    deleteNotes,
    reset,
  };
};
