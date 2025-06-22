import { useCallback, useEffect, useState } from "react";
import type { Message } from "../Chat/ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import React from "react"; // Added useMemo
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatPageManager } from "../Managers/ChatPageManager"; // Added import

interface UseChatPagesProps {
  chatId: string;
  getAccessTokenSilently: () => Promise<string>;
}

interface UseChatPagesReturn {
  pages: ChatPage[];
  isLoadingHistory: boolean;
  addMessage: (message: Message) => Promise<void>;
  getMessageList: () => Message[];
}

export const useChatPages = ({
  chatId,
  getAccessTokenSilently,
}: UseChatPagesProps): UseChatPagesReturn => {
  const [pages, setPages] = useState<ChatPage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Use a ref to hold the ChatPageManager instance
  // Initialize with a memoized instance to handle prop changes correctly
  const chatPageManagerRef = React.useRef<ChatPageManager>(
    new ChatPageManager(chatId, []) // Corrected: chatId is the first arg, pages is second
  );

  // Effect to update ChatPageManager instance if initial chatId changes
  // This is a simplified approach; a more robust solution might involve recreating the manager
  // or providing an update method if props that affect its core logic change.
  useEffect(() => {
    // If chatId is not set, or if the manager's current chatId doesn't match,
    // or if maxMessagesPerPage has changed, we might need to re-initialize or update the manager.
    // For simplicity, we'll re-initialize if chatId changes significantly or on first load with a chatId.
    // A more complex scenario might involve a method on ChatPageManager to update its config.
    if (
      chatId &&
      (chatPageManagerRef.current.getPages().length === 0 ||
        chatPageManagerRef.current.getPages()[0]?.chatId !== chatId)
    ) {
      // Corrected constructor call and removed syntax error
      chatPageManagerRef.current = new ChatPageManager(chatId, []);
      setPages(chatPageManagerRef.current.getPages()); // Reflect initial state
    }
  }, [chatId]); // Removed maxMessagesPerPage as ChatPageManager sets it internally

  const savePageToApi = useCallback(
    async (pageToSave: ChatPage) => {
      try {
        const accessToken = await getAccessTokenSilently();
        const chatHistoryAPI = new ChatHistoryAPI(accessToken);
        await chatHistoryAPI.saveChatPage(pageToSave);
      } catch (error) {
        console.error("Failed to save page:", pageToSave.pageId, error);
      }
    },
    [getAccessTokenSilently]
  );

  useEffect(() => {
    if (!chatId) {
      chatPageManagerRef.current = new ChatPageManager(
        chatId || "default_chat_id_on_reset",
        []
      );
      setPages([]);
      setIsLoadingHistory(false);
      return;
    }

    if (
      chatPageManagerRef.current.getPages().length === 0 ||
      (chatPageManagerRef.current.getPages()[0]?.chatId !== chatId && chatId) ||
      !chatPageManagerRef.current // Ensure it's initialized if it became null
    ) {
      chatPageManagerRef.current = new ChatPageManager(chatId, []);
    }

    setIsLoadingHistory(true);
    const loadHistory = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        const chatHistoryAPI = new ChatHistoryAPI(accessToken);
        const fetchedPages = await chatHistoryAPI.getChatHistory(chatId);

        chatPageManagerRef.current = new ChatPageManager(chatId, fetchedPages);
        setPages(chatPageManagerRef.current.getPages());
      } catch (error) {
        console.error("Failed to load chat history:", error);
        chatPageManagerRef.current = new ChatPageManager(chatId, []);
        setPages(chatPageManagerRef.current.getPages());
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [chatId, getAccessTokenSilently]); // Removed maxMessagesPerPage

  const getMessageList = useCallback(() => {
    return chatPageManagerRef.current.getMessageList();
  }, []);

  const addMessage = useCallback(
    async (message: Message) => {
      if (!chatId || !chatPageManagerRef.current) {
        console.error(
          "useChatPages: Cannot add message, chatId or ChatPageManager not available."
        );
        return;
      }

      chatPageManagerRef.current.addMessage(message);

      const updatedPages = chatPageManagerRef.current.getPages();
      setPages([...updatedPages]);

      if (updatedPages.length > 0) {
        const pageToSave = updatedPages[updatedPages.length - 1];
        if (pageToSave) await savePageToApi(pageToSave);
      }
    },
    [chatId, savePageToApi]
  );

  return {
    pages,
    addMessage,
    isLoadingHistory,
    getMessageList,
  };
};
