import { useEffect, useState } from "react";
import { useWorkflowImage } from "../../Images/hooks/useCivitJob";
import type { ChatSettings } from "../services/Chat/ChatSettings";
import { d } from "../../../services/Dependencies";
import { Theme } from "../../../components/Theme";

interface UseChatSettingsResult {
  chatSettings: ChatSettings | undefined;
  /** Resolved background photo - from generated workflow if present, otherwise from settings */
  backgroundPhotoBase64: string | undefined;
  /** Per-chat message transparency (0-1), defaults to theme default */
  messageTransparency: number;
  isLoading: boolean;
}

export const useChatSettings = (chatId: string): UseChatSettingsResult => {
  const [chatSettings, setChatSettings] = useState<ChatSettings | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const chatSettingsService = d.ChatSettingsService(chatId);

    const updateState = async () => {
      setIsLoading(chatSettingsService.isLoading());
      const data = await chatSettingsService.Get();
      setChatSettings(data);
      setIsLoading(chatSettingsService.isLoading());
    };

    const unsubscribe = chatSettingsService.subscribe(updateState);
    updateState();

    return unsubscribe;
  }, [chatId]);

  const backgroundPhotoWorkflowId =
    chatSettings?.backgroundPhotoWorkflowId ??
    chatSettings?.backgroundPhotoCivitJobId;

  const { photoBase64: workflowPhoto } = useWorkflowImage(
    chatId,
    backgroundPhotoWorkflowId || "",
  );

  const backgroundPhotoBase64 =
    workflowPhoto || chatSettings?.backgroundPhotoBase64;

  const messageTransparency =
    chatSettings?.messageTransparency ?? Theme.chatEntry.transparency;

  return {
    chatSettings,
    backgroundPhotoBase64,
    messageTransparency,
    isLoading,
  };
};
