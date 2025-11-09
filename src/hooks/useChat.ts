import { useCallback, useMemo, useState } from "react";
import type { Message } from "../pages/Chat/ChatMessage";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatCache } from "../Managers/ChatCache";
import { toSystemMessage, toUserMessage } from "../utils/messageUtils";
import { useChatFlow } from "./useChatFlow";
import { useChatHistory } from "./queries/useChatHistory";
import { useSystemSettings } from "./queries/useSystemSettings";
import { ImageGenerator } from "../Managers/ImageGenerator";
import { d } from "../app/Dependencies/Dependencies";

export const useChat = ({ chatId }: UseChatProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { chatCache, messages, isLoadingHistory } = useChatCache({
    chatId,
  });

  const { generateResponse, status } = useChatFlow({
    chatId,
    chatCache,
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

  const saveHistoryToApi = useCallback(
    async (messages: Message[]) => {
      if (!chatId) return;

      try {
        await new ChatHistoryAPI().saveChatHistory(chatId, messages);
      } catch (e) {
        d.ErrorService().log("Failed to save chat history", e);
      }
    },
    [chatId]
  );

  const addMessageToApi = useCallback(
    async (message: Message) => {
      if (!chatId) return;

      try {
        await new ChatHistoryAPI().addChatMessage(chatId, message);
      } catch (e) {
        d.ErrorService().log("Failed to add chat message", e);
      }
    },
    [chatId]
  );

  const getMessagesForLLM = useCallback(() => {
    return chatCache?.getMessagesForLLM() || [];
  }, [chatCache]);

  const addMessage = useCallback(
    async (message: Message) => {
      if (!chatCache) {
        return;
      }

      chatCache.addMessage(message);
      await addMessageToApi(message);
    },
    [chatCache, addMessageToApi]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!chatCache) {
        return;
      }

      chatCache.deleteMessage(messageId);
      await saveHistoryToApi(chatCache.getMessages());
    },
    [chatCache, saveHistoryToApi]
  );

  const deleteMessagesFromIndex = useCallback(
    async (messageId: string) => {
      if (!chatCache) {
        return;
      }

      chatCache.deleteMessagesAfterIndex(messageId);
      await saveHistoryToApi(chatCache.getMessages());
    },
    [chatCache, saveHistoryToApi]
  );

  const getDeletePreview = useCallback(
    (messageId: string) => {
      if (!chatCache) {
        return { messageCount: 0 };
      }
      return chatCache.getDeletePreview(messageId);
    },
    [chatCache]
  );

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      if (!chatCache) {
        return;
      }

      const message = chatCache.getMessage(messageId);
      if (!message) {
        console.warn(`Message with id ${messageId} not found`);
        return;
      }

      setIsLoading(true);

      try {
        // Delete the message first
        chatCache.deleteMessage(messageId);
        await saveHistoryToApi(chatCache.getMessages());

        // Generate a new response
        const responseMessage = await generateResponse();

        // Add the new response
        await addMessage(toSystemMessage(responseMessage));
      } catch (e) {
        d.ErrorService().log("Failed to regenerate response", e);
      } finally {
        setIsLoading(false);
      }
    },
    [chatCache, saveHistoryToApi, generateResponse, addMessage]
  );

  const generateImage = async () => {
    setIsLoading(true);
    if (!systemSettings) return;

    try {
      const imageGenerator = new ImageGenerator(systemSettings);
      const messageList = getMessagesForLLM();

      const generatedPrompt = await imageGenerator.generatePrompt(messageList);
      const jobId = await imageGenerator.triggerJob(generatedPrompt);

      addMessage({
        id: `civit-job-${Date.now()}`,
        role: "civit-job",
        content: JSON.stringify({ jobId }),
      });
    } catch (e) {
      d.ErrorService().log("Failed to generate image", e);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    messages,
    addMessage,
    submitMessage,
    deleteMessage,
    deleteMessagesFromIndex,
    regenerateResponse,
    getDeletePreview,
    isLoading: isLoading || isLoadingHistory,
    getMessagesForLLM,
    generateImage,
  };
};

interface UseChatCacheProps {
  chatId: string | null;
}

const useChatCache = ({ chatId }: UseChatCacheProps) => {
  const { data, isLoading: isLoadingHistory } = useChatHistory(chatId);

  const chatCache = useMemo(() => {
    if (!chatId) return null;
    return new ChatCache(chatId, data || []);
  }, [chatId, data]);

  const messages = chatCache?.getMessages() || [];

  return { chatCache, messages, isLoadingHistory };
};

interface UseChatProps {
  chatId: string;
}
