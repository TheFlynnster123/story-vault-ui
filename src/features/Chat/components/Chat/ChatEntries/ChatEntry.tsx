import React from "react";
import { UserMessage } from "./UserMessage";
import { SystemMessage } from "./SystemMessage";
import { CivitJobMessage } from "./CivitJobMessage";
import { ChapterMessage } from "./ChapterMessage";
import { BookMessage } from "./BookMessage";
import { StoryMessage } from "./StoryMessage";
import { PlanMessage } from "./PlanMessage";
import type {
  BookChatMessage,
  ChapterChatMessage,
  CivitJobChatMessage,
  PlanChatMessage,
  StoryChatMessage,
  UserChatMessage,
} from "../../../../../services/CQRS/UserChatProjection";

interface ChatEntryProps {
  chatId: string;
  message: UserChatMessage;
  isLastMessage?: boolean;
}

export const ChatEntry: React.FC<ChatEntryProps> = React.memo(({
  chatId,
  message,
  isLastMessage = false,
}) => {
  if (message.type === "story") {
    return (
      <StoryMessage chatId={chatId} message={message as StoryChatMessage} />
    );
  }

  if (message.type === "civit-job") {
    return (
      <CivitJobMessage
        chatId={chatId}
        message={message as CivitJobChatMessage}
        isLastMessage={isLastMessage}
      />
    );
  }

  if (message.type === "chapter") {
    return (
      <ChapterMessage chatId={chatId} chapter={message as ChapterChatMessage} />
    );
  }

  if (message.type === "book") {
    return <BookMessage chatId={chatId} book={message as BookChatMessage} />;
  }

  if (message.type === "plan") {
    return <PlanMessage chatId={chatId} message={message as PlanChatMessage} />;
  }

  if (message.type === "user-message") {
    return (
      <UserMessage
        chatId={chatId}
        message={message}
        isLastMessage={isLastMessage}
      />
    );
  }

  // Default to SystemMessage for all other types (system-message, assistant, etc.)
  return (
    <SystemMessage
      chatId={chatId}
      message={message}
      isLastMessage={isLastMessage}
    />
  );
}, (prev, next) =>
  prev.chatId === next.chatId &&
  prev.message === next.message &&
  prev.isLastMessage === next.isLastMessage
);
