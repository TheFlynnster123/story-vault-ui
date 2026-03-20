import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageContentWrapper,
  MessageItem,
  MessageText,
  RegeneratingLabel,
} from "./ChatMessage.styled";
import type { UserChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { MessageButtonsContainer } from "./ChatEntryButtons/MessageButtonsContainer";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay";

interface SystemMessageProps {
  chatId: string;
  message: UserChatMessage;
  isLastMessage: boolean;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({
  chatId,
  message,
  isLastMessage,
}) => {
  const [showButtons, setShowButtons] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setIsRegenerating(false);
  }, [message.content]);

  const toggle = () => !isRegenerating && setShowButtons(!showButtons);

  const handleRegenerate = () => {
    setShowButtons(false);
    setIsRegenerating(true);
  };

  return (
    <MessageItem $type="system">
      <MessageContentWrapper>
        <MessageText
          className="message-text clickable"
          $type="system"
          $isRegenerating={isRegenerating}
          onClick={toggle}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
          {isRegenerating && (
            <RegeneratingLabel>Regenerating…</RegeneratingLabel>
          )}
        </MessageText>

        <MessageOverlay show={showButtons} onBackdropClick={toggle}>
          <MessageButtonsContainer
            chatId={chatId}
            messageId={message.id}
            isLastMessage={isLastMessage}
            showRegenerate
            onRegenerate={handleRegenerate}
          />
        </MessageOverlay>
      </MessageContentWrapper>
    </MessageItem>
  );
};
