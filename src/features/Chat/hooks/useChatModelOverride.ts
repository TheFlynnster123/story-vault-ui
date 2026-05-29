import { useCallback } from "react";
import { useChatSettings } from "./useChatSettings";
import { useSystemSettings } from "../../SystemSettings/hooks/useSystemSettings";
import { useOpenRouterModels } from "../../OpenRouter/hooks/useOpenRouterModels";
import { d } from "../../../services/Dependencies";
import type { OpenRouterModel } from "../../OpenRouter/services/OpenRouterModelsAPI";
import type {
  OpenRouterReasoningEffort,
  OpenRouterRequestSettings,
} from "../../OpenRouter/services/OpenRouterRequestSettings";

interface UseChatModelOverrideResult {
  /** The effective model ID (chat override or system default) */
  activeModelId: string | undefined;
  /** The resolved OpenRouterModel for the active model */
  activeModel: OpenRouterModel | undefined;
  /** The reasoning effort paired with the active model, when configured */
  activeReasoningEffort: OpenRouterReasoningEffort | undefined;
  /** OpenRouter request settings paired with the active model */
  activeRequestSettings: OpenRouterRequestSettings | undefined;
  /** Whether we're using a chat-specific override (true) or the system default (false) */
  isOverridden: boolean;
  /** Set a per-chat model override */
  setModelOverride: (
    modelId: string,
    requestSettings?: OpenRouterRequestSettings,
  ) => Promise<void>;
  /** Clear the per-chat override, reverting to system default */
  clearModelOverride: () => Promise<void>;
  /** Whether settings are still loading */
  isLoading: boolean;
}

const findModelById = (
  models: OpenRouterModel[],
  modelId: string | undefined,
): OpenRouterModel | undefined =>
  modelId ? models.find((m) => m.id === modelId) : undefined;

export const useChatModelOverride = (
  chatId: string,
): UseChatModelOverrideResult => {
  const { chatSettings, isLoading: chatLoading } = useChatSettings(chatId);
  const { systemSettings, isLoading: systemLoading } = useSystemSettings();
  const { models } = useOpenRouterModels();

  const chatModelId = chatSettings?.modelOverride;
  const chatRequestSettings =
    chatSettings?.modelRequestSettingsOverride ??
    (chatSettings?.modelReasoningEffortOverride
      ? { reasoning: { effort: chatSettings.modelReasoningEffortOverride } }
      : undefined);
  const systemModelId = systemSettings?.chatGenerationSettings?.model;
  const systemRequestSettings = systemSettings?.chatGenerationSettings;

  const isOverridden = !!chatModelId;
  const activeModelId = chatModelId || systemModelId;
  const activeRequestSettings = isOverridden
    ? chatRequestSettings
    : systemRequestSettings;
  const activeReasoningEffort = activeRequestSettings?.reasoning?.effort;
  const activeModel = findModelById(models, activeModelId);

  const setModelOverride = useCallback(
    async (modelId: string, requestSettings?: OpenRouterRequestSettings) => {
      if (requestSettings) {
        await d.ChatSettingsService(chatId).setModelOverride(
          modelId,
          requestSettings,
        );
      } else {
        await d.ChatSettingsService(chatId).setModelOverride(modelId);
      }
    },
    [chatId],
  );

  const clearModelOverride = useCallback(async () => {
    await d.ChatSettingsService(chatId).setModelOverride(undefined);
  }, [chatId]);

  return {
    activeModelId,
    activeModel,
    activeReasoningEffort,
    activeRequestSettings,
    isOverridden,
    setModelOverride,
    clearModelOverride,
    isLoading: chatLoading || systemLoading,
  };
};
