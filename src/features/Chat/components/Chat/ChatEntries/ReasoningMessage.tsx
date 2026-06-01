import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageContentWrapper,
  MessageItem,
  ReasoningMessageHeader,
  ReasoningMessageText,
} from "./ChatMessage.styled";
import type { ReasoningChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay";
import { MessageButtonsContainer } from "./ChatEntryButtons/MessageButtonsContainer";

interface ReasoningMessageProps {
  chatId: string;
  message: ReasoningChatMessage;
  isLastMessage: boolean;
}

export const ReasoningMessage: React.FC<ReasoningMessageProps> = ({
  chatId,
  message,
  isLastMessage,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const disabled = message.data?.disabled ?? false;

  const toggleExpand = () => setExpanded(!expanded);
  const toggleButtons = () => setShowButtons(!showButtons);

  return (
    <MessageItem $type="system">
      <MessageContentWrapper $fitContent>
        <ReasoningMessageText className="message-text" $disabled={disabled}>
          <ReasoningMessageHeader onClick={toggleExpand}>
            Reasoning{disabled ? " disabled" : ""} {expanded ? "▾" : "▸"}
          </ReasoningMessageHeader>

          {expanded && (
            <div className="clickable" onClick={toggleButtons}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </ReasoningMessageText>

        <MessageOverlay show={showButtons} onBackdropClick={toggleButtons}>
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
