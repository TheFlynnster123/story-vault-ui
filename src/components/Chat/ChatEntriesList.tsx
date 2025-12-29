import React, { useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChatEntry } from "./ChatEntries/ChatEntry";
import { useUserChatProjection } from "./useUserChatProjection";

interface IChatEntriesList {
  chatId: string;
}

export const ChatEntriesList: React.FC<IChatEntriesList> = ({ chatId }) => {
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
