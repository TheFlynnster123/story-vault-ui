import { useEffect } from "react";
import { d } from "../app/Dependencies/Dependencies";

export const useEnsureChatInitialization = (chatId: string) => {
  useEffect(() => {
    // Initialize the chat event service when chatId changes
    d.ChatEventService(chatId).Initialize();
  }, [chatId]);

  return d.ChatService(chatId);
};
