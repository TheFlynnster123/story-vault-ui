import React, { useEffect, useRef, useState } from "react";
import { ChatMessage, type Message } from "./ChatMessage";
import type { ChatPage } from "../models/ChatPage";
import {
  IoArrowBack,
  IoChevronDown,
  IoChevronUp,
  IoBookmark,
} from "react-icons/io5";

interface ChatMessageListProps {
  pages: ChatPage[];
  toggleMenu: () => void;
  storyNote: string;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  pages,
  toggleMenu,
  storyNote,
}) => {
  const messageListRef = useRef<HTMLDivElement>(null);
  const messages = pages.flatMap((page) => page.messages);
  const [isStoryNoteExpanded, setIsStoryNoteExpanded] = useState(false);

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
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {storyNote && (
          <div className="story-note-container">
            <div className="story-note-header">
              <button
                className="story-note-toggle-icon"
                onClick={() => setIsStoryNoteExpanded(!isStoryNoteExpanded)}
                aria-label={
                  isStoryNoteExpanded ? "Hide story note" : "View story note"
                }
              >
                <IoBookmark size={18} />
              </button>
            </div>
            {isStoryNoteExpanded && (
              <div className="story-note-content">{storyNote}</div>
            )}
          </div>
        )}
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
