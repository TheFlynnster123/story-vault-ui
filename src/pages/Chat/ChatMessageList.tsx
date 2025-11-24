import React, { useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChatMessage } from "./ChatMessage";
import { CivitJobMessage } from "./CivitJobMessage";
import { useUserChatProjection } from "../../hooks/useUserChatProjection";
import type { UserChatMessage } from "../../cqrs/UserChatProjection";

interface ChatMessageListProps {
  chatId: string;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ chatId }) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { messages } = useUserChatProjection(chatId);
  const [shouldFollowOutput, setShouldFollowOutput] = useState(true);

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
  msg: UserChatMessage,
  index: number,
  totalMessages: number
): React.ReactNode {
  const isLastMessage = index === totalMessages - 1;

  return msg.type === "civit-job" ? (
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
