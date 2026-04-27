import { useCallback, useState, useEffect } from "react";
import { d } from "../../../services/Dependencies";
import { OpenRouterError } from "../../OpenRouter/services/OpenRouterError";
import type { MissingCharacterDescriptionDecision } from "../services/ChatGeneration/ImageGenerationService";

const isAlreadyHandled = (e: unknown): boolean => e instanceof OpenRouterError;

export const useChatGeneration = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const [missingCharacterName, setMissingCharacterName] = useState<
    string | null
  >(null);
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
    async (userInput: string, guidance?: string): Promise<string> => {
      try {
        if (userInput.trim()) {
          await d.ChatService(chatId).AddUserMessage(userInput);
        }

        return (await textGeneration.generateResponse(guidance)) ?? "";
      } catch (e) {
        if (!isAlreadyHandled(e)) {
          d.ErrorService().log("Failed to generate response", e);
        }
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
        if (!isAlreadyHandled(e)) {
          d.ErrorService().log("Failed to regenerate response", e);
        }
      }
    },
    [textGeneration],
  );

  const regenerateResponseWithFeedback = useCallback(
    async (messageId: string, feedback?: string) => {
      try {
        return await textGeneration.regenerateResponse(messageId, feedback);
      } catch (e) {
        if (!isAlreadyHandled(e)) {
          d.ErrorService().log(
            "Failed to regenerate response with feedback",
            e,
          );
        }
      }
    },
    [textGeneration],
  );

  const generateImage = useCallback(() => {
    imageGeneration
      .generateImage()
      .then((result) => {
        if (result.type === "missing-character-description") {
          setMissingCharacterName(result.characterName);
          return;
        }

        setMissingCharacterName(null);
      })
      .catch((e) => {
        if (!isAlreadyHandled(e)) {
          d.ErrorService().log("Failed to generate image", e);
        }
      });
  }, [imageGeneration]);

  const resolveMissingCharacterDescription = useCallback(
    async (
      decision: MissingCharacterDescriptionDecision,
    ): Promise<"none" | "navigate-to-characters"> => {
      if (!missingCharacterName) {
        return "none";
      }

      try {
        const result = await imageGeneration.resolveMissingCharacterDescription(
          missingCharacterName,
          decision,
        );

        setMissingCharacterName(null);

        if (result.type === "navigate-to-character-descriptions") {
          return "navigate-to-characters";
        }

        return "none";
      } catch (e) {
        if (!isAlreadyHandled(e)) {
          d.ErrorService().log(
            "Failed to resolve missing character description",
            e,
          );
        }
        return "none";
      }
    },
    [imageGeneration, missingCharacterName],
  );

  const dismissMissingCharacterDescription = useCallback(() => {
    setMissingCharacterName(null);
  }, []);

  const isTextLoading = textGeneration?.IsLoading || false;
  const isImageLoading = imageGeneration?.IsLoading || false;
  const status = textGeneration?.Status;

  return {
    generateResponse,
    regenerateResponse,
    regenerateResponseWithFeedback,
    generateImage,
    missingCharacterName,
    resolveMissingCharacterDescription,
    dismissMissingCharacterDescription,
    status,
    isTextLoading,
    isImageLoading,
  };
};
