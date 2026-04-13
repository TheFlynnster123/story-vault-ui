import { useState } from "react";
import {
  MessageContentWrapper,
  MessageItem,
  NoteMessageText,
  NoteMessageHeader,
  NoteExpirationBadge,
} from "./ChatMessage.styled";
import type { NoteChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { MessageOverlay } from "./ChatEntryButtons/MessageOverlay";
import { NoteMessageButtonsContainer } from "./ChatEntryButtons/NoteMessageButtonsContainer";

interface NoteMessageProps {
  chatId: string;
  message: NoteChatMessage;
}

const formatExpiration = (message: NoteChatMessage): string => {
  if (message.data.expired) return "Expired";
  if (message.data.expiresAfterMessages === null) return "No expiration";
  return `Expires after ${message.data.expiresAfterMessages} messages`;
};

export const NoteMessage: React.FC<NoteMessageProps> = ({
  chatId,
  message,
}) => {
  const [showButtons, setShowButtons] = useState(false);
  const toggleButtons = () => setShowButtons(!showButtons);

  return (
    <MessageItem $type="system">
      <MessageContentWrapper>
        <NoteMessageText
          className="message-text clickable"
          $expired={message.data.expired}
          onClick={toggleButtons}
        >
          <NoteMessageHeader>
            📝 Note
            <NoteExpirationBadge $expired={message.data.expired}>
              — {formatExpiration(message)}
            </NoteExpirationBadge>
          </NoteMessageHeader>
          {message.content}
        </NoteMessageText>

        <MessageOverlay show={showButtons} onBackdropClick={toggleButtons}>
          <NoteMessageButtonsContainer
            chatId={chatId}
            message={message}
          />
        </MessageOverlay>
      </MessageContentWrapper>
    </MessageItem>
  );
};
