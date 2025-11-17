import { useEffect, useState } from "react";
import { getChatInputCacheInstance } from "../queries/chat-cache/ChatInputCache";

export const useChatInputCache = (chatId: string | null) => {
  const [, forceUpdate] = useState({});
  const inputCache = getChatInputCacheInstance(chatId);

  useEffect(() => {
    if (!inputCache) return;
    return inputCache.subscribe(() => forceUpdate({}));
  }, [inputCache]);

  return {
    inputValue: inputCache?.getInputValue() || "",
    setInputValue: (value: string) => inputCache?.setInputValue(value),
    clearInputValue: () => inputCache?.clearInputValue(),
  };
};
