import React, { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import "./Chat.css";
import { ChatMessageList } from "./ChatMessageList";
import { useChat } from "../hooks/useChat";

interface ChatProps {
  chatId: string;
  toggleMenu: () => void;
}

export const Chat: React.FC<ChatProps> = ({ chatId, toggleMenu }) => {
  const {
    pages,
    isSendingMessage,
    submitMessage,
    isLoadingHistory,
    progressStatus,
    chatFlowHistory,
    storySummary,
    userPreferences,
  } = useChat({
    chatId,
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isSendingMessage) inputRef.current?.focus();
  }, [isSendingMessage]);

  if (isLoadingHistory) return <LoadingSpinner />;

  return (
    <div className="chat-container" data-chatid={chatId}>
      <ChatMessageList
        pages={pages}
        toggleMenu={toggleMenu}
        chatFlowHistory={chatFlowHistory}
        storySummary={storySummary}
        userPreferences={userPreferences}
      />
      {progressStatus && (
        <div className="progress-status">{progressStatus}</div>
      )}
      <ChatInput
        ref={inputRef}
        onSubmit={submitMessage}
        isSending={isSendingMessage}
        placeholder={"Type your message here..."}
      />
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="chat-container">
    <div className="loading-spinner-container">
      <div className="loading-spinner"></div>
    </div>
  </div>
);
