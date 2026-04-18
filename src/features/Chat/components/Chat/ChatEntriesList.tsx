import React, { useRef } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChatEntry } from "./ChatEntries/ChatEntry";
import { useUserChatProjection } from "../../hooks/useUserChatProjection";

interface IChatEntriesList {
  chatId: string;
}

export const ChatEntriesList: React.FC<IChatEntriesList> = ({ chatId }) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { messages } = useUserChatProjection(chatId);

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={messages}
      style={{ height: "100%", width: "100%" }}
      followOutput={false}
      itemContent={(index, msg) => (
        <ChatEntry
          key={msg.id}
          chatId={chatId}
          message={msg}
          isLastMessage={index === messages.length - 1}
        />
      )}
      increaseViewportBy={{ top: 800, bottom: 800 }}
      initialTopMostItemIndex={messages.length - 1}
    />
  );
};
