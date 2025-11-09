import { useCallback, useMemo, useState } from "react";
import type { Message } from "../pages/Chat/ChatMessage";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatManager } from "../Managers/ChatManager";
import { toSystemMessage, toUserMessage } from "../utils/messageUtils";
import { useChatFlow } from "./useChatFlow";
import { useChatHistory } from "./queries/useChatHistory";
import { useSystemSettings } from "./queries/useSystemSettings";
import { ImageGenerator } from "../Managers/ImageGenerator";
import { d } from "../app/Dependencies/Dependencies";

export const useChat = ({ chatId }: UseChatProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { chatManager, messages, isLoadingHistory } = useChatManager({
    chatId,
  });

  const { generateResponse, status } = useChatFlow({
    chatId,
    chatManager,
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

  const getMessageList = useCallback(() => {
    return chatManager?.getMessageList() || [];
  }, [chatManager]);

  const addMessage = useCallback(
    async (message: Message) => {
      if (!chatManager) {
        return;
      }

      chatManager.addMessage(message);
      await addMessageToApi(message);
    },
    [chatManager, addMessageToApi]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!chatManager) {
        return;
      }

      chatManager.deleteMessage(messageId);
      await saveHistoryToApi(chatManager.getMessages());
    },
    [chatManager, saveHistoryToApi]
  );

  const deleteMessagesFromIndex = useCallback(
    async (messageId: string) => {
      if (!chatManager) {
        return;
      }

      chatManager.deleteMessagesAfterIndex(messageId);
      await saveHistoryToApi(chatManager.getMessages());
    },
    [chatManager, saveHistoryToApi]
  );

  const getDeletePreview = useCallback(
    (messageId: string) => {
      if (!chatManager) {
        return { messageCount: 0 };
      }
      return chatManager.getDeletePreview(messageId);
    },
    [chatManager]
  );

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      if (!chatManager) {
        return;
      }

      const message = chatManager.getMessage(messageId);
      if (!message) {
        console.warn(`Message with id ${messageId} not found`);
        return;
      }

      setIsLoading(true);

      try {
        // Delete the message first
        chatManager.deleteMessage(messageId);
        await saveHistoryToApi(chatManager.getMessages());

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
    [chatManager, saveHistoryToApi, generateResponse, addMessage]
  );

  const generateImage = async () => {
    setIsLoading(true);
    if (!systemSettings) return;

    try {
      const imageGenerator = new ImageGenerator(systemSettings);
      const messageList = getMessageList();

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
    getMessageList,
    generateImage,
  };
};

interface UseChatManagerProps {
  chatId: string | null;
}

const useChatManager = ({ chatId }: UseChatManagerProps) => {
  const { data, isLoading: isLoadingHistory } = useChatHistory(chatId);

  const chatManager = useMemo(() => {
    if (!chatId) return null;
    return new ChatManager(chatId, data || []);
  }, [chatId, data]);

  const messages = chatManager?.getMessages() || [];

  return { chatManager, messages, isLoadingHistory };
};

interface UseChatProps {
  chatId: string;
}
