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

  const { addMessage, getMessagesForLLM } = useChatCache(chatId);

  const generateResponse = useCallback(
    async (userInput: string): Promise<string> => {
      await addMessage(toUserMessage(userInput));

      return (await chatGeneration.generateResponse()) ?? "";
    },
    [chatGeneration, addMessage]
  );

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      try {
        return await chatGeneration.regenerateResponse(messageId);
      } catch (e) {
        d.ErrorService().log("Failed to regenerate response", e);
      }
    },
    [chatGeneration]
  );

  const regenerateResponseWithFeedback = useCallback(
    async (messageId: string, feedback?: string) => {
      try {
        return await chatGeneration.regenerateResponse(messageId, feedback);
      } catch (e) {
        d.ErrorService().log("Failed to regenerate response with feedback", e);
      }
    },
    [chatGeneration]
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
    regenerateResponseWithFeedback,
    generateImage,
    status: chatGeneration?.Status,
    isLoading: chatGeneration?.IsLoading || false,
  };
};
