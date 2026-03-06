import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";

export const useChatInputCache = (chatId: string) => {
  const [, forceUpdate] = useState({});
  const inputCache = d.ChatInputCache(chatId);

  useEffect(() => {
    return inputCache.subscribe(() => forceUpdate({}));
  }, [inputCache]);

  return {
    inputValue: inputCache.getInputValue(),
    setInputValue: (value: string) => inputCache.setInputValue(value),
    clearInputValue: () => inputCache.clearInputValue(),
  };
};
