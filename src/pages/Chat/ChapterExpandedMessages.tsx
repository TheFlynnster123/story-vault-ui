import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Loader } from "@mantine/core";
import { d } from "../../app/Dependencies/Dependencies";
import { ChatMessage } from "./ChatMessage";
import { ChapterMessageButtons } from "./ChatMessageButtons/ChapterMessageButtons";

const DetailsContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const DirectionSection = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(99, 102, 241, 0.15);
  border-left: 3px solid rgba(99, 102, 241, 0.5);
  border-radius: 4px;
`;

const DirectionLabel = styled.div`
  font-weight: 600;
  color: rgba(99, 102, 241, 1);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const DirectionText = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  white-space: pre-wrap;
`;

const MessagesSection = styled.div``;

const MessagesLabel = styled.div`
  font-weight: 600;
  color: rgba(168, 85, 247, 0.9);
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

const ActionsSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

interface ChapterExpandedDetailsProps {
  chatId: string;
  chapterId: string;
  nextChapterDirection?: string;
}

export const ChapterExpandedDetails: React.FC<ChapterExpandedDetailsProps> = ({
  chatId,
  chapterId,
  nextChapterDirection,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMessages = () => {
      try {
        const chapterMessages = d
          .UserChatProjection(chatId)
          .getChapterMessages(chapterId);
        setMessages(chapterMessages);
      } catch (error) {
        d.ErrorService().log("Failed to load chapter messages", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [chatId, chapterId]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <Loader size="sm" />
      </LoadingContainer>
    );
  }

  return (
    <DetailsContainer>
      {nextChapterDirection && nextChapterDirection.trim() && (
        <DirectionSection>
          <DirectionLabel>📍 Next Chapter Direction</DirectionLabel>
          <DirectionText>{nextChapterDirection}</DirectionText>
        </DirectionSection>
      )}

      <MessagesSection>
        <MessagesLabel>📚 Chapter Messages</MessagesLabel>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
            No messages in this chapter
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              chatId={chatId}
              message={msg}
              isLastMessage={false}
            />
          ))
        )}
      </MessagesSection>

      <ActionsSection>
        <ChapterMessageButtons chatId={chatId} chapterId={chapterId} />
      </ActionsSection>
    </DetailsContainer>
  );
};
