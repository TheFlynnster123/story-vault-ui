import { useState } from "react";
import {
  MessageContentWrapper,
  MessageItem,
  NoteMessageHeader,
  NoteMessageText,
} from "./ChatMessage.styled";
import type { AgentClarificationChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay";
import { DeleteButton } from "./ChatEntryButtons/DeleteButton";

interface AgentClarificationMessageProps {
  chatId: string;
  message: AgentClarificationChatMessage;
}

export const AgentClarificationMessage: React.FC<
  AgentClarificationMessageProps
> = ({ chatId, message }) => {
  const [showButtons, setShowButtons] = useState(false);
  const toggleButtons = () => setShowButtons(!showButtons);

  return (
    <MessageItem $type="system">
      <MessageContentWrapper>
        <NoteMessageText
          className="message-text clickable"
          onClick={toggleButtons}
        >
          <NoteMessageHeader>Agent Clarification</NoteMessageHeader>
          <strong>Question:</strong> {message.data.question}
          {"\n"}
          <strong>Answer:</strong> {message.data.answer}
        </NoteMessageText>

        <MessageOverlay show={showButtons} onBackdropClick={toggleButtons}>
          <DeleteButton chatId={chatId} messageId={message.id} />
        </MessageOverlay>
      </MessageContentWrapper>
    </MessageItem>
  );
};
