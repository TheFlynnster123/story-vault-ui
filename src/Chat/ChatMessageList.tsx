import React, { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import type { ChatPage } from "../models/ChatPage";

interface ChatMessageListProps {
  pages: ChatPage[];
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ pages }) => {
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageListRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = messageListRef.current;
      // A threshold to decide if we should scroll down.
      // If the user is within 100px of the bottom, we'll scroll.
      const atBottom = scrollHeight - clientHeight <= scrollTop + 100;
      if (atBottom) {
        messageListRef.current.scrollTop = scrollHeight;
      }
    }
  }, [pages]);

  return (
    <div className="message-list" ref={messageListRef}>
      {pages.map((page) => (
        <React.Fragment key={page.pageId}>
          {page.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};
