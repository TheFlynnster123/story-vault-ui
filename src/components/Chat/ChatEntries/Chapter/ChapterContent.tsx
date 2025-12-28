import React from "react";
import styled from "styled-components";
import type { ChapterChatMessage } from "../../../../services/CQRS/UserChatProjection";

const SummaryText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  white-space: pre-wrap;
`;

interface ChapterContentProps {
  chapter: ChapterChatMessage;
}

export const ChapterContent: React.FC<ChapterContentProps> = ({ chapter }) => (
  <SummaryText>{chapter.content}</SummaryText>
);
