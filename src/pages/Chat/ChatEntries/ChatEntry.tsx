import React from "react";
import { UserMessage } from "./UserMessage";
import { SystemMessage } from "./SystemMessage";
import { CivitJobMessage } from "./CivitJobMessage";
import { ChapterMessage } from "./ChapterMessage";
import { StoryMessage } from "./StoryMessage";
import type {
  UserChatMessage,
  CivitJobChatMessage,
  ChapterChatMessage,
  StoryChatMessage,
} from "../../../cqrs/UserChatProjection";

interface ChatEntryProps {
  chatId: string;
  message: UserChatMessage;
  isLastMessage?: boolean;
}

export const ChatEntry: React.FC<ChatEntryProps> = ({
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
};
