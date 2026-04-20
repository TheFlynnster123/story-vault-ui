import React, { useState } from "react";
import styled from "styled-components";
import { Button } from "@mantine/core";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import { Theme } from "../../../../../components/Theme";
import type { BookChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { BookContent } from "./Book/BookContent";
import { BookExpandedDetails } from "./Book/BookExpandedDetails";
import { transparencyColor } from "./transparencyColor";

const MessageContainer = styled.div`
  padding: 1rem;
  background: linear-gradient(
    135deg,
    ${transparencyColor(Theme.book.backgroundPrimary)} 0%,
    ${transparencyColor(Theme.book.backgroundSecondary)} 100%
  );
  border-left: 4px solid ${Theme.book.border};
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  margin-top: 1rem;
`;

const BookHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.1rem;
  color: ${Theme.book.headerText};
  margin-bottom: 0.5rem;
`;

const ExpandButtonContainer = styled.div`
  margin-top: 0.5rem;
`;

interface BookMessageProps {
  chatId: string;
  book: BookChatMessage;
}

export const BookMessage: React.FC<BookMessageProps> = ({ chatId, book }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="message-item">
      <MessageContainer>
        <BookHeader>📚 {book.data.title}</BookHeader>

        <BookContent book={book} />

        <ExpandButtonContainer>
          <Button
            variant="subtle"
            size="xs"
            onClick={handleToggleExpand}
            rightSection={
              isExpanded ? <RiArrowUpSLine /> : <RiArrowDownSLine />
            }
          >
            {isExpanded ? "Hide Chapters" : "Show Chapters"}
          </Button>
        </ExpandButtonContainer>

        {isExpanded && <BookExpandedDetails chatId={chatId} bookId={book.id} />}
      </MessageContainer>
    </div>
  );
};
