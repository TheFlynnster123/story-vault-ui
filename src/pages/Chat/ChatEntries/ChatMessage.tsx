import "../ChatMessage.styled.ts";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageOverlay } from "../ChatMessageButtons/MessageOverlay.tsx";
import { MessageButtonsContainer } from "../ChatMessageButtons/MessageButtonsContainer.tsx";
import type { UserChatMessage } from "../../../cqrs/UserChatProjection.ts";
import {
  MessageContentWrapper,
  MessageItem,
  MessageText,
} from "../ChatMessage.styled.ts";

interface MessageItemProps {
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

  const messageTextType = message.type === "user-message" ? "user" : "system";

  const toggle = () => setShowButtons(!showButtons);

  return (
    <MessageItem $type={messageTextType}>
      <MessageContentWrapper>
        <MessageText
          className={`message-text ${isLastMessage ? "clickable" : ""}`}
          $type={messageTextType}
          onClick={toggle}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </MessageText>

        <MessageOverlay show={showButtons} onBackdropClick={toggle}>
          <MessageButtonsContainer
            chatId={chatId}
            messageId={message.id}
            isLastMessage={isLastMessage}
          />
        </MessageOverlay>
      </MessageContentWrapper>
    </MessageItem>
  );
};
