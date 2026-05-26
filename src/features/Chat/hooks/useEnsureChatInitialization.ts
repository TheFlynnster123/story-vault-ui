import { useEffect } from "react";
import { d } from "../../../services/Dependencies";

export const useEnsureChatInitialization = (chatId: string) => {
  useEffect(() => {
    if (!chatId) return;

    const initialize = async () => {
      await d.ChatEventService(chatId).Initialize();
      await d.ImageGenerationService(chatId).resumePendingGenerations();
    };

    void initialize();
  }, [chatId]);

  return d.ChatService(chatId);
};
