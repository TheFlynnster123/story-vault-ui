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
  const isStreaming = message.isStreaming === true;
  const [expanded, setExpanded] = useState(isStreaming);
  const [showButtons, setShowButtons] = useState(false);
  const disabled = message.data?.disabled ?? false;

  const toggleExpand = () => setExpanded(!expanded);
  const toggleButtons = () => {
    if (!isStreaming) setShowButtons(!showButtons);
  };

  return (
    <MessageItem $type="system">
      <MessageContentWrapper $fitContent>
        <ReasoningMessageText className="message-text" $disabled={disabled}>
          <ReasoningMessageHeader
            aria-expanded={expanded}
            aria-busy={isStreaming}
            onClick={toggleExpand}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleExpand();
              }
            }}
          >
            Reasoning{isStreaming ? "…" : disabled ? " disabled" : ""}{" "}
            {expanded ? "▾" : "▸"}
          </ReasoningMessageHeader>

          {expanded && (
            <div
              aria-live={isStreaming ? "polite" : undefined}
              className={isStreaming ? undefined : "clickable"}
              onClick={toggleButtons}
            >
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
