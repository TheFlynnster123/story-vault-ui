import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Loader } from "@mantine/core";
import { d } from "../../../../../../services/Dependencies";
import { BookMessageButtons } from "./BookMessageButtons";
import { ChatEntry } from "../ChatEntry";

const DetailsContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const ChaptersSection = styled.div``;

const ChaptersLabel = styled.div`
  font-weight: 600;
  color: rgba(16, 185, 129, 0.9);
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

const ActionsSection = styled.div`
  margin-bottom: 1.5rem;
`;

interface BookExpandedDetailsProps {
  chatId: string;
  bookId: string;
}

export const BookExpandedDetails: React.FC<BookExpandedDetailsProps> = ({
  chatId,
  bookId,
}) => {
  const [chapters, setChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChapters = () => {
      try {
        const bookChapters = d
          .UserChatProjection(chatId)
          .getBookChapters(bookId);
        setChapters(bookChapters);
      } catch (error) {
        d.ErrorService().log("Failed to load book chapters", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChapters();
  }, [chatId, bookId]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <Loader size="sm" />
      </LoadingContainer>
    );
  }

  return (
    <DetailsContainer>
      <ActionsSection>
        <BookMessageButtons chatId={chatId} bookId={bookId} />
      </ActionsSection>

      <ChaptersSection>
        <ChaptersLabel>📖 Book Chapters</ChaptersLabel>
        {chapters.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
            No chapters in this book
          </div>
        ) : (
          chapters.map((chapter) => (
            <ChatEntry
              key={chapter.id}
              chatId={chatId}
              message={chapter}
              isLastMessage={false}
            />
          ))
        )}
      </ChaptersSection>
    </DetailsContainer>
  );
};
