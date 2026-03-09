import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageContentWrapper,
  MessageItem,
  PlanMessageHeader,
  PlanMessageText,
} from "./ChatMessage.styled";
import type { PlanChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { MessageButtonsContainer } from "./ChatEntryButtons/MessageButtonsContainer";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay";

interface PlanMessageProps {
  chatId: string;
  message: PlanChatMessage;
  isLastMessage: boolean;
}

export const PlanMessage: React.FC<PlanMessageProps> = ({
  chatId,
  message,
  isLastMessage,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const toggleExpand = () => setExpanded(!expanded);
  const toggleButtons = () => setShowButtons(!showButtons);

  return (
    <MessageItem $type="system">
      <MessageContentWrapper>
        <PlanMessageText className="message-text">
          <PlanMessageHeader className="clickable" onClick={toggleExpand}>
            📋 {message.data.planName} Updated {expanded ? "▾" : "▸"}
          </PlanMessageHeader>

          {expanded && (
            <div className="clickable" onClick={toggleButtons}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </PlanMessageText>

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
