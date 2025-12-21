import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageOverlay } from "../ChatMessageButtons/MessageOverlay";
import { MessageButtonsContainer } from "../ChatMessageButtons/MessageButtonsContainer";
import type { UserChatMessage } from "../../../cqrs/UserChatProjection";
import {
  MessageContentWrapper,
  MessageItem,
  MessageText,
} from "../ChatMessage.styled";

interface UserMessageProps {
  chatId: string;
  message: UserChatMessage;
  isLastMessage: boolean;
}

export const UserMessage: React.FC<UserMessageProps> = ({
  chatId,
  message,
  isLastMessage,
}) => {
  const [showButtons, setShowButtons] = useState(false);

  const toggle = () => setShowButtons(!showButtons);

  return (
    <MessageItem $type="user">
      <MessageContentWrapper>
        <MessageText
          className="message-text clickable"
          $type="user"
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
