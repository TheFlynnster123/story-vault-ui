import "./ChatMessage.css";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageOverlay } from "./ChatMessageButtons/MessageOverlay";
import { MessageButtonsContainer } from "./ChatMessageButtons/MessageButtonsContainer";
import type { UserChatMessage } from "../../cqrs/UserChatProjection";

export interface MessageItemProps {
  chatId: string;
  message: UserChatMessage;
  isLastMessage: boolean;
}

export const ChatMessage: React.FC<MessageItemProps> = ({
  chatId,
  message,
  isLastMessage,
}) => {
  const [showButtons, setShowButtons] = useState(false);

  const messageClass =
    message.type === "user-message" ? "message-user" : "message-system";

  const messageTextType = message.type === "user-message" ? "user" : "system";
  const messageTextStyle = `message-text ${messageTextType}`;

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
