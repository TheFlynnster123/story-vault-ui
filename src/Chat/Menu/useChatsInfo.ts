import { useEffect, useState } from "react";
import { useChatSettings } from "../../hooks/useChatSettings";
import { useChatHistoryApi } from "../../hooks/useChatHistoryAPI";

export const useChatsInfo = () => {
  const [chatIds, setChatIds] = useState<string[]>([]);
  const chatHistoryAPI = useChatHistoryApi();
  const { chatSettings, loadChatSettings } = useChatSettings();

  useEffect(() => {
    const loadChatsAndSettings = async () => {
      try {
        const fetchedChatIds = await chatHistoryAPI!.getChats();
        setChatIds(fetchedChatIds);

        await Promise.all(
          fetchedChatIds.map((chatId) => loadChatSettings(chatId))
        );
      } catch (error) {
        console.error("Failed to fetch chats or get access token:", error);
      }
    };

    if (chatHistoryAPI) loadChatsAndSettings();
  }, [chatHistoryAPI]);

  return { chatIds, chatSettings, refreshChats: () => {} };
};
