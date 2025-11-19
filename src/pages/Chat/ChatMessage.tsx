import "./ChatMessage.css";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../../models/ChatMessages/Messages";
import { MessageOverlay } from "./ChatMessageButtons/MessageOverlay";
import { MessageButtonsContainer } from "./ChatMessageButtons/MessageButtonsContainer";

export interface MessageItemProps {
  chatId: string;
  message: Message;
  isLastMessage: boolean;
}

export const ChatMessage: React.FC<MessageItemProps> = ({
  chatId,
  message,
  isLastMessage,
}) => {
  const [showButtons, setShowButtons] = useState(false);

  const messageClass =
    message.role === "user" ? "message-user" : "message-system";

  const messageTextStyle = `message-text ${message.role}`;

  const toggleButtons = () => setShowButtons(!showButtons);

  return (
    <div className={`message-item ${messageClass}`}>
      <div className="message-content-wrapper">
        <div
          className={`${messageTextStyle} ${isLastMessage ? "clickable" : ""}`}
          onClick={toggleButtons}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        <MessageOverlay show={showButtons} onBackdropClick={toggleButtons}>
          <MessageButtonsContainer
            chatId={chatId}
            messageId={message.id}
            isLastMessage={isLastMessage}
          />
        </MessageOverlay>
      </div>
    </div>
  );
};
