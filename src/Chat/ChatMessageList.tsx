import React, { useEffect, useRef } from "react";
import { ChatMessage, type Message } from "./ChatMessage";
import type { ChatPage } from "../models/ChatPage";

interface ChatMessageListProps {
  pages: ChatPage[];
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ pages }) => {
  const messageListRef = useRef<HTMLDivElement>(null);
  const messages = pages.flatMap((page) => page.messages);

  useAutoScrolling(messageListRef, messages);

  return (
    <div className="message-list" ref={messageListRef}>
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
    </div>
  );
};

function useAutoScrolling(
  messageListRef: React.RefObject<HTMLDivElement | null>,
  messages: Message[]
) {
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    const handleScroll = () => {
      if (messageListRef.current) {
        const { scrollHeight, clientHeight, scrollTop } =
          messageListRef.current;
        const atBottom = scrollHeight - clientHeight <= scrollTop + 1;
        isAtBottomRef.current = atBottom;
      }
    };

    const currentMessageList = messageListRef.current;
    currentMessageList?.addEventListener("scroll", handleScroll);

    return () => {
      currentMessageList?.removeEventListener("scroll", handleScroll);
    };
  }, [messageListRef]);

  useEffect(() => {
    if (messageListRef.current && isAtBottomRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, messageListRef]);
}
