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
  const { pages, isSendingMessage, submitMessage, isLoadingHistory } = useChat({
    chatId,
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isSendingMessage) inputRef.current?.focus();
  }, [isSendingMessage]);

  if (isLoadingHistory)
    return <div className="chat-container">Loading chat history...</div>;

  return (
    <div className="chat-container" data-chatid={chatId}>
      <ChatMessageList pages={pages} toggleMenu={toggleMenu} />
      <ChatInput
        ref={inputRef}
        onSubmit={submitMessage}
        isSending={isSendingMessage}
        isDisabled={false}
        placeholder={"Type your message here..."}
      />
    </div>
  );
};
