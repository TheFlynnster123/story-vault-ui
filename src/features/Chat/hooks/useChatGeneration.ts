import { useCallback, useState, useEffect } from "react";
import { d } from "../../../services/Dependencies";

export const useChatGeneration = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const textGeneration = d.TextGenerationService(chatId);
  const imageGeneration = d.ImageGenerationService(chatId);

  useEffect(() => {
    const unsubText = textGeneration?.subscribe(() => forceUpdate({}));
    const unsubImage = imageGeneration?.subscribe(() => forceUpdate({}));

    return () => {
      unsubText?.();
      unsubImage?.();
    };
  }, [textGeneration, imageGeneration]);

  const generateResponse = useCallback(
    async (userInput: string): Promise<string> => {
      try {
        if (userInput.trim()) {
          await d.ChatService(chatId).AddUserMessage(userInput);
        }

        return (await textGeneration.generateResponse()) ?? "";
      } catch (e) {
        d.ErrorService().log("Failed to generate response", e);
        return "";
      }
    },
    [textGeneration],
  );

  const regenerateResponse = useCallback(
    async (messageId: string) => {
      try {
        return await textGeneration.regenerateResponse(messageId);
      } catch (e) {
        d.ErrorService().log("Failed to regenerate response", e);
      }
    },
    [textGeneration],
  );

  const regenerateResponseWithFeedback = useCallback(
    async (messageId: string, feedback?: string) => {
      try {
        return await textGeneration.regenerateResponse(messageId, feedback);
      } catch (e) {
        d.ErrorService().log("Failed to regenerate response with feedback", e);
      }
    },
    [textGeneration],
  );

  const generateImage = useCallback(() => {
    imageGeneration.generateImage().catch((e) => {
      d.ErrorService().log("Failed to generate image", e);
    });
  }, [imageGeneration]);

  const isTextLoading = textGeneration?.IsLoading || false;
  const isImageLoading = imageGeneration?.IsLoading || false;
  const status = textGeneration?.Status;

  return {
    generateResponse,
    regenerateResponse,
    regenerateResponseWithFeedback,
    generateImage,
    status,
    isTextLoading,
    isImageLoading,
  };
};
