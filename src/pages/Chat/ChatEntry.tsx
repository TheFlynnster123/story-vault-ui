import React from "react";
import { ChatMessage } from "./ChatMessage";
import { CivitJobMessage } from "./CivitJobMessage";
import { ChapterMessage } from "./Chapter/ChapterMessage";
import type {
  UserChatMessage,
  CivitJobChatMessage,
  ChapterChatMessage,
} from "../../cqrs/UserChatProjection";

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

  return (
    <ChatMessage
      chatId={chatId}
      message={message}
      isLastMessage={isLastMessage}
    />
  );
};
