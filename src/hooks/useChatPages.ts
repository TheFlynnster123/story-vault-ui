import { useCallback, useEffect, useState } from "react";
import type { Message } from "../Chat/ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatPageManager } from "../Managers/ChatPageManager";

export const useChatPages = ({
  chatId,
  getAccessTokenSilently,
}: UseChatPagesProps) => {
  const { chatPageManager, pages, setPages, isLoadingHistory, chatHistoryApi } =
    useChatPageManager({ chatId, getAccessTokenSilently });

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

  return {
    pages,
    addMessage,
    isLoadingHistory,
    getMessageList,
  };
};

interface UseChatHistoryApiProps {
  getAccessTokenSilently: () => Promise<string>;
}

const useChatHistoryApi = ({
  getAccessTokenSilently,
}: UseChatHistoryApiProps) => {
  const [chatHistoryApi, setChatHistoryApi] = useState<ChatHistoryAPI | null>(
    null
  );

  useEffect(() => {
    const initializeApi = async () => {
      try {
        const accessToken = await getAccessTokenSilently();
        setChatHistoryApi(new ChatHistoryAPI(accessToken));
      } catch (error) {
        console.error("Failed to initialize ChatHistoryAPI:", error);
        setChatHistoryApi(null);
      }
    };

    initializeApi();
  }, [getAccessTokenSilently]);

  return chatHistoryApi;
};

interface UseChatPageManagerProps {
  chatId: string | null;
  getAccessTokenSilently: () => Promise<string>;
}

const useChatPageManager = ({
  chatId,
  getAccessTokenSilently,
}: UseChatPageManagerProps) => {
  const chatHistoryApi = useChatHistoryApi({ getAccessTokenSilently });
  const [chatPageManager, setChatPageManager] =
    useState<ChatPageManager | null>(null);
  const [pages, setPages] = useState<ChatPage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  useEffect(() => {
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
  getAccessTokenSilently: () => Promise<string>;
}
