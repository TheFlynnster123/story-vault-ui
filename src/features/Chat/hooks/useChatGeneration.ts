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
        const hasUserInput = userInput.trim().length > 0;
        const visibleMessages = hasUserInput
          ? d.UserChatProjection(chatId).GetMessages()
          : [];
        const previousMessage = visibleMessages[visibleMessages.length - 1];
        const skipReasoning =
          hasUserInput && previousMessage?.type === "reasoning";

        if (hasUserInput) {
          await d.ChatService(chatId).AddUserMessage(userInput);
          void maybeAutoRunAgentFlow(chatId);
        }

        return (
          (await textGeneration.generateResponse(guidance, skipReasoning)) ?? ""
        );
      } catch (e) {
        if (!isAlreadyHandled(e)) {
          d.ErrorService().log("Failed to generate response", e);
        }
        return "";
      }
    },
    [chatId, textGeneration],
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

  useEffect(() => {
    if (imageGeneration?.PendingMissingCharacter?.characterName) {
      setMissingCharacterName(
        imageGeneration.PendingMissingCharacter.characterName,
      );
    }
  }, [
    imageGeneration,
    imageGeneration?.PendingMissingCharacter?.characterName,
  ]);

  const resolveMissingCharacterDescription = useCallback(
    async (
      decision: MissingCharacterDescriptionDecision,
    ): Promise<"none" | "navigate-to-characters"> => {
      const activeMissingCharacterName =
        missingCharacterName ??
        imageGeneration?.PendingMissingCharacter?.characterName ??
        null;

      if (!activeMissingCharacterName) {
        return "none";
      }

      const name = activeMissingCharacterName;

      if (decision === "generate") {
        // Close the modal immediately so the user isn't blocked waiting for
        // description generation. The image generation spinner stays active
        // because orchestrate() keeps IsLoading = true throughout.
        setMissingCharacterName(null);
        imageGeneration
          .resolveMissingCharacterDescription(name, decision)
          .catch((e) => {
            if (!isAlreadyHandled(e)) {
              d.ErrorService().log(
                "Failed to generate character description and image",
                e,
              );
            }
          });
        return "none";
      }

      try {
        const result = await imageGeneration.resolveMissingCharacterDescription(
          name,
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
    if (imageGeneration) {
      imageGeneration.PendingMissingCharacter = undefined;
    }
    setMissingCharacterName(null);
  }, [imageGeneration]);

  const displayedMissingCharacterName =
    missingCharacterName ??
    imageGeneration?.PendingMissingCharacter?.characterName ??
    null;

  const isTextLoading = textGeneration?.IsLoading || false;
  const isImageLoading = imageGeneration?.IsLoading || false;
  const status = textGeneration?.Status;

  return {
    generateResponse,
    regenerateResponse,
    regenerateResponseWithFeedback,
    generateImage,
    missingCharacterName: displayedMissingCharacterName,
    resolveMissingCharacterDescription,
    dismissMissingCharacterDescription,
    status,
    isTextLoading,
    isImageLoading,
  };
};

const maybeAutoRunAgentFlow = async (chatId: string): Promise<void> => {
  try {
    const chatSettingsService = d.ChatSettingsService(chatId);
    const settings = await chatSettingsService.Get();
    if (!settings?.agentFlowAutoRunEnabled) return;

    const interval = Math.max(1, settings.agentFlowAutoRunInterval ?? 3);
    const nextCount = (settings.agentFlowMessagesSinceLastRun ?? 0) + 1;

    if (nextCount < interval) {
      await chatSettingsService.update({
        agentFlowMessagesSinceLastRun: nextCount,
      });
      return;
    }

    await chatSettingsService.update({
      agentFlowMessagesSinceLastRun: 0,
    });

    await d.AgentFlowService(chatId).analyzeIntentSuggestion();
  } catch (error) {
    d.ErrorService().log("Failed to auto-run agent flow", error);
  }
};
