import { useCallback, useEffect, useState } from "react";
import type { Message } from "../Chat/ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import { ChatHistoryAPI } from "../clients/ChatHistoryAPI";
import { ChatManager } from "../Managers/ChatManager";
import { toSystemMessage, toUserMessage } from "../utils/messageUtils";
import { useChatFlow } from "./useChatFlow";
import { useSystemSettings } from "./queries/useSystemSettings";
import { GrokChatAPI } from "../clients/GrokChatAPI";
import { CivitJobAPI } from "../clients/CivitJobAPI";
import type { ImageGenerationSettings } from "../models/SystemSettings";

export const useChat = ({ chatId }: UseChatProps) => {
  const { chatPageManager, pages, setPages, isLoadingHistory } = useChatManager(
    { chatId }
  );

  const { generateResponse, status } = useChatFlow({
    chatId,
    chatManager: chatPageManager,
  });

  const { systemSettings } = useSystemSettings();

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

  const generateImage = async () => {
    const messages = getMessageList();

    const hardcodedPrompt =
      "Respond with ONLY a comma separated list depicting the current characters for image generation purposes.If the story has been NSFW, include NSFW tags/prompt features. Example: 'woman sitting, touching face, chair, table, at chair, black dress, evening, classy, restaurant, italian'";

    const promptMessages = [...messages, toSystemMessage(hardcodedPrompt)];

    const generatedPrompt = await new GrokChatAPI(systemSettings).postChat(
      promptMessages
    );

    const defaultSettings: ImageGenerationSettings = {
      model: "urn:air:sdxl:checkpoint:civitai:288584@324524",
      params: {
        prompt: generatedPrompt,
        negativePrompt:
          "text, logo, watermark, signature, letterbox, bad anatomy, missing limbs, missing fingers, deformed, cropped, lowres, bad anatomy, bad hands, jpeg artifacts",
        scheduler: "DPM2Karras",
        steps: 16,
        cfgScale: 7,
        width: 1024,
        height: 1024,
        clipSkip: 2,
      },
      additionalNetworks: {
        "urn:air:sdxl:lora:civitai:45521@558984": {
          strength: 0.8,
        },
      },
    };

    const settings = systemSettings?.imageGenerationSettings || defaultSettings;
    settings.params.prompt = generatedPrompt;

    try {
      const response = await new CivitJobAPI().generateImage(settings);
      const jobId = response.jobs[0].jobId;
      addMessage({
        id: `civit-job-${Date.now()}`,
        role: "civit-job",
        content: JSON.stringify({ jobId }),
      });
    } catch (error) {
      console.error("Failed to generate image:", error);
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
    isLoadingHistory,
    getMessageList,
    generateImage,
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
