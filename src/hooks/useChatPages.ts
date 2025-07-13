import { useCallback, useEffect, useState } from "react";
import type { Message } from "../Chat/ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatManager } from "../Managers/ChatManager";
import { toSystemMessage, toUserMessage } from "../utils/messageUtils";
import { useChatFlow } from "./useChatFlow";

export const useChat = ({ chatId }: UseChatProps) => {
  const { chatPageManager, pages, setPages, isLoadingHistory } = useChatManager(
    { chatId }
  );

  const { generateResponse } = useChatFlow({
    chatId,
    chatManager: chatPageManager,
  });

  const submitMessage = async (userMessage: string) => {
    await addMessage(toUserMessage(userMessage));

    const responseMessage = await generateResponse();

    await addMessage(toSystemMessage(responseMessage));
  };

  const savePageToApi = useCallback(async (pageToSave: ChatPage) => {
    try {
      await new ChatHistoryAPI().saveChatPage(pageToSave);
    } catch (error) {
      console.error("Failed to save page:", pageToSave.pageId, error);
    }
  }, []);

  const getMessageList = useCallback(() => {
    return chatPageManager?.getMessageList() || [];
  }, [chatPageManager]);

  const addMessage = useCallback(
    async (message: Message) => {
      if (!chatPageManager) {
        return;
      }

      chatPageManager.addMessage(message);
      const updatedPages = chatPageManager.getPages();
      setPages([...updatedPages]);

      const lastPage = updatedPages[updatedPages.length - 1];
      if (lastPage) {
        await savePageToApi(lastPage);
      }
    },
    [chatPageManager, savePageToApi, setPages]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!chatPageManager) {
        return;
      }

      const location = chatPageManager.findMessageLocation(messageId);
      if (!location) {
        console.warn(`Message with id ${messageId} not found`);
        return;
      }

      chatPageManager.deleteMessage(messageId);
      const updatedPages = chatPageManager.getPages();
      setPages([...updatedPages]);

      // Save the affected page
      const affectedPage = updatedPages[location.pageIndex];
      if (affectedPage) {
        await savePageToApi(affectedPage);
      }
    },
    [chatPageManager, savePageToApi, setPages]
  );

  const deleteMessagesFromIndex = useCallback(
    async (messageId: string) => {
      if (!chatPageManager) {
        return;
      }

      const location = chatPageManager.findMessageLocation(messageId);
      if (!location) {
        console.warn(`Message with id ${messageId} not found`);
        return;
      }

      chatPageManager.deleteMessagesAfterIndex(messageId);
      const updatedPages = chatPageManager.getPages();
      setPages([...updatedPages]);

      // Save all affected pages (from the target page onwards)
      const affectedPages = updatedPages.slice(location.pageIndex);
      for (const page of affectedPages) {
        await savePageToApi(page);
      }
    },
    [chatPageManager, savePageToApi, setPages]
  );

  const getDeletePreview = useCallback(
    (messageId: string) => {
      if (!chatPageManager) {
        return { messageCount: 0, pageCount: 0 };
      }
      return chatPageManager.countMessagesFromIndex(messageId);
    },
    [chatPageManager]
  );

  return {
    pages,
    addMessage,
    submitMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
    getMessageList,
  };
};

interface UseChatManagerProps {
  chatId: string | null;
}

const useChatManager = ({ chatId }: UseChatManagerProps) => {
  const [chatPageManager, setChatManager] = useState<ChatManager | null>(null);
  const [pages, setPages] = useState<ChatPage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  useEffect(() => {
    if (!chatId) {
      setIsLoadingHistory(false);
      setPages([]);
      setChatManager(null);
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      let fetchedPages: ChatPage[] = [];
      try {
        fetchedPages = await new ChatHistoryAPI().getChatHistory(chatId);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        const manager = new ChatManager(chatId, fetchedPages);
        setChatManager(manager);
        setPages(manager.getPages());
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [chatId]);

  return { chatPageManager, pages, setPages, isLoadingHistory };
};

interface UseChatProps {
  chatId: string;
}
