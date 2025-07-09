import React, { useEffect, useRef } from "react";
import { ChatMessage, type Message } from "./ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import { ChatFlowCollapsibleV2 } from "./ChatFlowCollapsibleV2";
import type { ChatFlowV2Step } from "../constants/chatFlowV2";

interface ChatMessageListV2Props {
  pages: ChatPage[];
  chatFlowHistory?: ChatFlowV2Step[];
  onDeleteMessage?: (messageId: string) => void;
  onDeleteFromHere?: (messageId: string) => void;
  getDeletePreview?: (messageId: string) => {
    messageCount: number;
    pageCount: number;
  };
  onDeleteNotes?: () => Promise<void>;
}

export const ChatMessageListV2: React.FC<ChatMessageListV2Props> = ({
  pages,
  chatFlowHistory = [],
  onDeleteMessage,
  onDeleteFromHere,
  getDeletePreview,
  onDeleteNotes,
}) => {
  const messageListRef = useRef<HTMLDivElement>(null);
  const messages = pages.flatMap((page) => page.messages);

  useAutoScrolling(messageListRef, messages);

  return (
    <div className="message-list" ref={messageListRef}>
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          onDeleteMessage={onDeleteMessage}
          onDeleteFromHere={onDeleteFromHere}
          getDeletePreview={getDeletePreview}
        />
      ))}
      <ChatFlowCollapsibleV2
        chatFlowHistory={chatFlowHistory}
        onDeleteNotes={onDeleteNotes}
      />
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
