import React, { useEffect, useRef } from "react";
import { ChatMessage, type Message } from "./ChatMessage";
import type { ChatPage } from "../models/ChatPage";

interface ChatMessageListProps {
  pages: ChatPage[];
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ pages }) => {
  const messageListRef = useRef<HTMLDivElement>(null);
  const messages = pages.flatMap((page) => page.messages);

  useAutoScrolling(pages, messageListRef, messages);

  return (
    <div className="message-list" ref={messageListRef}>
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
    </div>
  );
};

function useAutoScrolling(
  pages: ChatPage[],
  messageListRef: React.RefObject<HTMLDivElement | null>,
  messages: Message[]
) {
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current && pages.length > 0) {
      if (messageListRef.current)
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;

      isInitialRender.current = false;
    }
  }, [pages]);

  useEffect(() => {
    if (!messageListRef.current) return;

    const { scrollHeight, clientHeight, scrollTop } = messageListRef.current;
    const atBottom = scrollHeight - clientHeight <= scrollTop + 100;

    if (atBottom) messageListRef.current.scrollTop = scrollHeight;
  }, [messages.length]);
}
