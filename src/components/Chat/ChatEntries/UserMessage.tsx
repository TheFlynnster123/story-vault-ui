import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageContentWrapper,
  MessageItem,
  MessageText,
} from "./ChatMessage.styled";
import type { UserChatMessage } from "../../../services/CQRS/UserChatProjection";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay";
import { MessageButtonsContainer } from "./ChatEntryButtons/MessageButtonsContainer";

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
