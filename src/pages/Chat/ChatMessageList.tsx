import React, { useEffect, useRef } from "react";
import { ChatMessage, type Message } from "./ChatMessage";
import { CivitJobMessage } from "./CivitJobMessage";
import { useChatCache } from "../../hooks/useChatCache";

interface ChatMessageListProps {
  chatId: string;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ chatId }) => {
  const messageListRef = useRef<HTMLDivElement>(null);
  const { messages } = useChatCache(chatId);

  useAutoScrolling(messageListRef, messages);

  return (
    <div className="message-list" ref={messageListRef}>
      {messages.map((msg, index) => {
        const isLastMessage = index === messages.length - 1;

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
      })}
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
    const handleResize = () => {
      if (isAtBottomRef.current && messageListRef.current) {
        setTimeout(() => {
          if (messageListRef.current) {
            messageListRef.current.scrollTop =
              messageListRef.current.scrollHeight;
          }
        }, 100);
      }
    };

    window.addEventListener("resize", handleResize);

    const handleVisibilityChange = () => {
      if (!document.hidden && isAtBottomRef.current && messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [messageListRef]);

  useEffect(() => {
    if (messageListRef.current && isAtBottomRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, messageListRef]);
}
