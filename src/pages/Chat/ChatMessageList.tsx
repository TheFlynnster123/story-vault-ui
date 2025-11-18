import React, { useEffect, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChatMessage } from "./ChatMessage";
import { CivitJobMessage } from "./CivitJobMessage";
import { useChatCache } from "../../hooks/useChatCache";
import type { Message } from "../../models/ChatMessages/Messages";

interface ChatMessageListProps {
  chatId: string;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ chatId }) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { messages } = useChatCache(chatId);
  const [shouldFollowOutput, setShouldFollowOutput] = useState(true);

  useScrollToBottomOnNewMessages(virtuosoRef, messages, shouldFollowOutput);

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={messages}
      followOutput={shouldFollowOutput ? "smooth" : false}
      atBottomStateChange={(atBottom) => setShouldFollowOutput(atBottom)}
      itemContent={(index, msg) =>
        renderMessageItem(chatId, msg, index, messages.length)
      }
      increaseViewportBy={{ top: 800, bottom: 800 }}
      initialTopMostItemIndex={messages.length - 1}
    />
  );
};

function renderMessageItem(
  chatId: string,
  msg: Message,
  index: number,
  totalMessages: number
): React.ReactNode {
  const isLastMessage = index === totalMessages - 1;

  return msg.role === "civit-job" ? (
    <CivitJobMessage
      chatId={chatId}
      key={msg.id}
      message={msg}
      isLastMessage={isLastMessage}
    />
  ) : (
    <ChatMessage
      chatId={chatId}
      key={msg.id}
      message={msg}
      isLastMessage={isLastMessage}
    />
  );
}

function useScrollToBottomOnNewMessages(
  virtuosoRef: React.RefObject<VirtuosoHandle | null>,
  messages: Message[],
  shouldFollowOutput: boolean
) {
  const previousMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const hasNewMessages = messages.length > previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;

    if (hasNewMessages && shouldFollowOutput && virtuosoRef.current) {
      // Scroll to bottom when new messages arrive and user is at bottom
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        behavior: "smooth",
      });
    }
  }, [messages, shouldFollowOutput, virtuosoRef]);
}
