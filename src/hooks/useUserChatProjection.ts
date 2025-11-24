import { useEffect, useState } from "react";
import { d } from "../app/Dependencies/Dependencies";
import type { UserChatMessage } from "../cqrs/UserChatProjection";

interface UseUserChatProjectionReturn {
  messages: UserChatMessage[];
  getChapterMessages: (chapterId: string) => UserChatMessage[];
}

export function useUserChatProjection(
  chatId: string
): UseUserChatProjectionReturn {
  const [messages, setMessages] = useState<UserChatMessage[]>([]);

  const onNotify = async () => {
    const messages = await d.UserChatProjection(chatId).GetMessages();
    setMessages(messages);
  };

  useEffect(() => {
    const projection = d.UserChatProjection(chatId);
    const unsubscribe = projection.subscribe(onNotify);

    onNotify();

    return () => {
      unsubscribe();
    };
  }, [chatId]);

  return {
    messages: messages,
    getChapterMessages: (chapterId: string) =>
      d.UserChatProjection(chatId).getChapterMessages(chapterId),
  };
}
