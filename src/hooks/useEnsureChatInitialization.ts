import { useEffect } from "react";
import { d } from "../app/Dependencies/Dependencies";

export const useEnsureChatInitialization = (chatId: string) => {
  const initializeChatEventService = () => {
    d.ChatEventService(chatId).Initialize();
  };

  useEffect(() => {
    initializeChatEventService();
  }, [chatId]);
  return d.ChatService(chatId);
};
