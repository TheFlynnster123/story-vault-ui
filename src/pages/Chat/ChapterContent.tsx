import React from "react";
import styled from "styled-components";
import type { ChapterChatMessage } from "../../cqrs/UserChatProjection";

const SummaryText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  white-space: pre-wrap;
`;

interface ChapterContentProps {
  message: ChapterChatMessage;
}

export const ChapterContent: React.FC<ChapterContentProps> = ({
  message,
}) => {
  return (
    <SummaryText>{message.content}</SummaryText>
  );
};
