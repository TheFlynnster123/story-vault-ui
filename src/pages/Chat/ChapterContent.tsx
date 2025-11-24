import React from "react";
import styled from "styled-components";
import type { ChapterChatMessage } from "../../cqrs/UserChatProjection";
import { ChapterMessageButtons } from "./ChatMessageButtons/ChapterMessageButtons";

const SummaryText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  white-space: pre-wrap;
`;

interface ChapterContentProps {
  chatId: string;
  message: ChapterChatMessage;
  showDeleteButtons: boolean;
}

export const ChapterContent: React.FC<ChapterContentProps> = ({
  chatId,
  message,
  showDeleteButtons,
}) => {
  return (
    <>
      <SummaryText>{message.content}</SummaryText>

      {showDeleteButtons && (
        <ChapterMessageButtons chatId={chatId} chapterId={message.id} />
      )}
    </>
  );
};
