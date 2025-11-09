import { useCallback, useState, useEffect } from "react";
import { toUserMessage } from "../utils/messageUtils";
import { d } from "../app/Dependencies/Dependencies";
import { useChatCache } from "./useChatCache";

export interface IUseChatGenerationProps {
  chatId: string;
}

export const useChatGeneration = ({ chatId }: IUseChatGenerationProps) => {
  const [, forceUpdate] = useState({});
  const chatGeneration = d.ChatGenerationService(chatId);

  useEffect(() => {
    if (!chatGeneration) return;
    return chatGeneration.subscribe(() => forceUpdate({}));
  }, [chatGeneration]);

  const { chatCache, addMessage, deleteMessage, getMessagesForLLM } =
    useChatCache(chatId);

  const generateResponse = useCallback(
    async (userInput: string): Promise<string> => {
      await addMessage(toUserMessage(userInput));

      return (await chatGeneration.generateResponse()) ?? "";
    },
    [chatCache, chatGeneration, addMessage]
  );

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      const message = chatCache?.getMessage(messageId);

      if (!message) {
        console.warn(`Message with id ${messageId} not found`);
        return;
      }

      try {
        await deleteMessage(messageId);

        await chatGeneration.generateResponse();
      } catch (e) {
        d.ErrorService().log("Failed to regenerate response", e);
      }
    },
    [chatCache, chatGeneration, deleteMessage, addMessage]
  );

  const generateImage = useCallback(async () => {
    try {
      const messageList = await getMessagesForLLM();

      const generatedPrompt = await d
        .ImageGenerator()
        .generatePrompt(messageList);

      const jobId = await d.ImageGenerator().triggerJob(generatedPrompt);

      await addMessage({
        id: `civit-job-${Date.now()}`,
        role: "civit-job",
        content: JSON.stringify({ jobId }),
      });
    } catch (e) {
      d.ErrorService().log("Failed to generate image", e);
    }
  }, [getMessagesForLLM, addMessage]);

  return {
    generateResponse,
    regenerateResponse,
    generateImage,
    status: chatGeneration?.Status,
    isLoading: chatGeneration?.IsLoading || false,
  };
};
