import { useCallback, useEffect, useMemo, useState } from "react";
import type { Message } from "../Chat/ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatManager } from "../Managers/ChatManager";
import { toSystemMessage, toUserMessage } from "../utils/messageUtils";
import { useChatFlow } from "./useChatFlow";
import { useChatHistory } from "./queries/useChatHistory";
import { useSystemSettings } from "./queries/useSystemSettings";
import { ImageGenerator } from "../Managers/ImageGenerator";

export const useChat = ({ chatId }: UseChatProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { chatPageManager, pages, setPages, isLoadingHistory } = useChatManager(
    { chatId }
  );

  const { generateResponse, status } = useChatFlow({
    chatId,
    chatManager: chatPageManager,
  });

  const { systemSettings } = useSystemSettings();

  const submitMessage = async (userMessage: string) => {
    setIsLoading(true);

    try {
      await addMessage(toUserMessage(userMessage));

      const responseMessage = await generateResponse();

      await addMessage(toSystemMessage(responseMessage));
    } finally {
      setIsLoading(false);
    }
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

  const generateImage = async () => {
    setIsLoading(true);
    if (!systemSettings) return;

    try {
      const imageGenerator = new ImageGenerator(systemSettings);
      const messages = getMessageList();

      const generatedPrompt = await imageGenerator.generatePrompt(messages);
      const jobId = await imageGenerator.triggerJob(generatedPrompt);

      addMessage({
        id: `civit-job-${Date.now()}`,
        role: "civit-job",
        content: JSON.stringify({ jobId }),
      });
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    pages,
    addMessage,
    submitMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    getDeletePreview,
    isLoading: isLoading || isLoadingHistory,
    getMessageList,
    generateImage,
  };
};

interface UseChatManagerProps {
  chatId: string | null;
}

const useChatManager = ({ chatId }: UseChatManagerProps) => {
  const [pages, setPages] = useState<ChatPage[]>([]);

  const { data: fetchedPages, isLoading: isLoadingHistory } =
    useChatHistory(chatId);

  const chatPageManager = useMemo(() => {
    if (!chatId) return null;
    return new ChatManager(chatId, fetchedPages || []);
  }, [chatId, fetchedPages]);

  useEffect(() => {
    if (chatPageManager) {
      setPages(chatPageManager.getPages());
    } else {
      setPages([]);
    }
  }, [chatPageManager]);

  return { chatPageManager, pages, setPages, isLoadingHistory };
};

interface UseChatProps {
  chatId: string;
}
