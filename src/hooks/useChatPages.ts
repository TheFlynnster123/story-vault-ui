import { useCallback, useEffect, useState } from "react";
import type { Message } from "../Chat/ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatPageManager } from "../Managers/ChatPageManager";
import { useAuth0 } from "@auth0/auth0-react";
import { useEncryption } from "./useEncryption";
import type { EncryptionManager } from "../Managers/EncryptionManager";

export const useChatPages = ({ chatId }: UseChatPagesProps) => {
  const { chatPageManager, pages, setPages, isLoadingHistory, chatHistoryApi } =
    useChatPageManager({ chatId });

  const savePageToApi = useCallback(
    async (pageToSave: ChatPage) => {
      if (!chatHistoryApi) return;
      try {
        await chatHistoryApi.saveChatPage(pageToSave);
      } catch (error) {
        console.error("Failed to save page:", pageToSave.pageId, error);
      }
    },
    [chatHistoryApi]
  );

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

      chatPageManager.deleteMessagesFromIndex(messageId);
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
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoadingHistory,
    getMessageList,
  };
};

const useChatHistoryApi = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { encryptionManager } = useEncryption();
  const [chatHistoryApi, setChatHistoryApi] = useState<ChatHistoryAPI | null>(
    null
  );

  useEffect(() => {
    const initializeApi = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        setChatHistoryApi(
          new ChatHistoryAPI(
            encryptionManager as EncryptionManager,
            accessToken
          )
        );
      } catch (error) {
        console.error("Failed to initialize ChatHistoryAPI:", error);
        setChatHistoryApi(null);
      }
    };

    if (encryptionManager) initializeApi();
  }, [getAccessTokenSilently, encryptionManager]);

  return chatHistoryApi;
};

interface UseChatPageManagerProps {
  chatId: string | null;
}

const useChatPageManager = ({ chatId }: UseChatPageManagerProps) => {
  const chatHistoryApi = useChatHistoryApi();
  const [chatPageManager, setChatPageManager] =
    useState<ChatPageManager | null>(null);
  const [pages, setPages] = useState<ChatPage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  useEffect(() => {
    console.log(chatId);
    console.log(chatHistoryApi);

    if (!chatId || !chatHistoryApi) {
      setIsLoadingHistory(false);
      setPages([]);
      setChatPageManager(null);
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      let fetchedPages: ChatPage[] = [];
      try {
        fetchedPages = await chatHistoryApi.getChatHistory(chatId);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        const manager = new ChatPageManager(chatId, fetchedPages);
        setChatPageManager(manager);
        setPages(manager.getPages());
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [chatId, chatHistoryApi]);

  return { chatPageManager, pages, setPages, isLoadingHistory, chatHistoryApi };
};

interface UseChatPagesProps {
  chatId: string;
}
