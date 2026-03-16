import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageContentWrapper,
  MessageItem,
  PlanMessageHeader,
  PlanMessageText,
} from "./ChatMessage.styled";
import type { PlanChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { PlanMessageButtonsContainer } from "./ChatEntryButtons/PlanMessageButtonsContainer";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay";
import { usePlanGenerationStatus } from "../../../../Plans/hooks/usePlanGenerationStatus";

interface PlanMessageProps {
  chatId: string;
  message: PlanChatMessage;
}

export const PlanMessage: React.FC<PlanMessageProps> = ({
  chatId,
  message,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const { isGenerating } = usePlanGenerationStatus(chatId);

  const toggleExpand = () => setExpanded(!expanded);
  const toggleButtons = () => setShowButtons(!showButtons);

  if (isGenerating(message.data.planDefinitionId)) return null;

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
          <PlanMessageButtonsContainer
            chatId={chatId}
            messageId={message.id}
            planDefinitionId={message.data.planDefinitionId}
            priorContent={message.content}
          />
        </MessageOverlay>
      </MessageContentWrapper>
    </MessageItem>
  );
};
