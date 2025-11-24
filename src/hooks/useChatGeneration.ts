import { useCallback, useState, useEffect } from "react";
import { d } from "../app/Dependencies/Dependencies";

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

  const generateResponse = useCallback(
    async (userInput: string): Promise<string> => {
      await d.ChatService(chatId).AddUserMessage(userInput);

      return (await chatGeneration.generateResponse()) ?? "";
    },
    [chatGeneration]
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
      await chatGeneration.generateImage();
    } catch (e) {
      d.ErrorService().log("Failed to generate image", e);
    }
  }, [chatGeneration]);

  return {
    generateResponse,
    regenerateResponse,
    regenerateResponseWithFeedback,
    generateImage,
    status: chatGeneration?.Status,
    isLoading: chatGeneration?.IsLoading || false,
  };
};
