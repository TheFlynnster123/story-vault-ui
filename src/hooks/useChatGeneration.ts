import { useState, useCallback } from "react";
import { useNotes } from "./useNotes";
import { useMemories } from "./useMemories";
import { useSystemSettings } from "./queries/useSystemSettings";
import { useChatSettings } from "./queries/useChatSettings";
import { ChatGeneration } from "../app/ChatGeneration/ChatGeneration";
import { PlanningNotesService } from "../app/ChatGeneration/ChatGenerationPlanningNotes";
import { useChatCache } from "./useChatCache";
import { ImageGenerator } from "../Managers/ImageGenerator";
import { toSystemMessage, toUserMessage } from "../utils/messageUtils";
import { d } from "../app/Dependencies/Dependencies";

export interface IUseChatGenerationProps {
  chatId: string;
}

export const useChatGeneration = ({ chatId }: IUseChatGenerationProps) => {
  const { notes } = useNotes(chatId);
  const { memories } = useMemories(chatId);
  const [status, setStatus] = useState<string>("Ready");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { systemSettings } = useSystemSettings();
  const { chatSettings } = useChatSettings(chatId);
  const { chatCache, addMessage, deleteMessage, getMessagesForLLM } =
    useChatCache(chatId);

  const generateResponse = useCallback(
    async (userInput: string): Promise<string> => {
      if (!chatCache) return "";

      const userMessage = toUserMessage(userInput);
      await addMessage(userMessage);

      const planningNotesService = new PlanningNotesService(
        systemSettings as any,
        chatSettings as any
      );

      const chatGeneration = new ChatGeneration(
        chatCache,
        planningNotesService,
        notes,
        memories,
        systemSettings,
        chatSettings,
        setStatus,
        setIsLoading
      );

      return (await chatGeneration.generateResponse()) ?? "";
    },
    [chatCache, systemSettings, chatSettings, notes, memories]
  );

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      if (!chatCache) return;

      const message = chatCache.getMessage(messageId);
      if (!message) {
        console.warn(`Message with id ${messageId} not found`);
        return;
      }

      setIsLoading(true);

      try {
        await deleteMessage(messageId);

        const planningNotesService = new PlanningNotesService(
          systemSettings as any,
          chatSettings as any
        );

        const chatGeneration = new ChatGeneration(
          chatCache,
          planningNotesService,
          notes,
          memories,
          systemSettings,
          chatSettings,
          setStatus,
          setIsLoading
        );

        const responseMessage = await chatGeneration.generateResponse();

        if (responseMessage) await addMessage(toSystemMessage(responseMessage));
      } catch (e) {
        d.ErrorService().log("Failed to regenerate response", e);
      } finally {
        setIsLoading(false);
      }
    },
    [chatCache, deleteMessage, generateResponse, addMessage]
  );

  const generateImage = useCallback(async () => {
    setIsLoading(true);
    if (!systemSettings) return;

    try {
      const imageGenerator = new ImageGenerator(systemSettings);
      const messageList = await getMessagesForLLM();

      const generatedPrompt = await imageGenerator.generatePrompt(messageList);
      const jobId = await imageGenerator.triggerJob(generatedPrompt);

      await addMessage({
        id: `civit-job-${Date.now()}`,
        role: "civit-job",
        content: JSON.stringify({ jobId }),
      });
    } catch (e) {
      d.ErrorService().log("Failed to generate image", e);
    } finally {
      setIsLoading(false);
    }
  }, [systemSettings, getMessagesForLLM, addMessage]);

  return {
    generateResponse,
    regenerateResponse,
    generateImage,
    status,
    isLoading,
  };
};
