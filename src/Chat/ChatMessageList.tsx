import React, { useEffect, useRef } from "react";
import { ChatMessage, type Message } from "./ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import type { PreResponseNote, PostResponseNote } from "../models";
import { IoArrowBack } from "react-icons/io5";
import { ChatFlowCollapsible } from "./ChatFlowCollapsible";
import type { ChatFlowStep } from "../hooks/useChatFlow";

interface ChatMessageListProps {
  pages: ChatPage[];
  toggleMenu: () => void;
  chatFlowHistory?: ChatFlowStep[];
  preResponseNotes: PreResponseNote[];
  postResponseNotes: PostResponseNote[];
  onDeleteMessage?: (messageId: string) => void;
  onDeleteFromHere?: (messageId: string) => void;
  getDeletePreview?: (messageId: string) => {
    messageCount: number;
    pageCount: number;
  };
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  pages,
  toggleMenu,
  chatFlowHistory = [],
  preResponseNotes,
  postResponseNotes,
  onDeleteMessage,
  onDeleteFromHere,
  getDeletePreview,
}) => {
  const messageListRef = useRef<HTMLDivElement>(null);
  const messages = pages.flatMap((page) => page.messages);

  useAutoScrolling(messageListRef, messages);

  return (
    <>
      <button
        className="message-list-menu-button"
        onClick={toggleMenu}
        aria-label="Back to menu"
      >
        <IoArrowBack size={20} />
      </button>
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
        <ChatFlowCollapsible
          chatFlowHistory={chatFlowHistory}
          preResponseNotes={preResponseNotes}
          postResponseNotes={postResponseNotes}
        />
      </div>
    </>
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
