import React, { useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChatMessage } from "./ChatMessage";
import { CivitJobMessage } from "./CivitJobMessage";
import { ChapterMessage } from "./Chapter/ChapterMessage";
import { useUserChatProjection } from "../../hooks/useUserChatProjection";
import type {
  UserChatMessage,
  CivitJobChatMessage,
  ChapterChatMessage,
} from "../../cqrs/UserChatProjection";

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
      style={{ height: "100%", width: "100%" }}
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

  if (msg.type === "civit-job") {
    return (
      <CivitJobMessage
        chatId={chatId}
        key={msg.id}
        message={msg as CivitJobChatMessage}
      />
    );
  }

  if (msg.type === "chapter") {
    return (
      <ChapterMessage
        chatId={chatId}
        key={msg.id}
        chapter={msg as ChapterChatMessage}
      />
    );
  }

  return (
    <ChatMessage
      chatId={chatId}
      key={msg.id}
      message={msg}
      isLastMessage={isLastMessage}
    />
  );
}
