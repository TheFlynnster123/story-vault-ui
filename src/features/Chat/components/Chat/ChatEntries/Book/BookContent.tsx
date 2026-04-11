import React from "react";
import styled from "styled-components";
import type { BookChatMessage } from "../../../../../../services/CQRS/UserChatProjection";

const SummaryText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  white-space: pre-wrap;
`;

interface BookContentProps {
  book: BookChatMessage;
}

export const BookContent: React.FC<BookContentProps> = ({ book }) => (
  <SummaryText>{book.content}</SummaryText>
);
