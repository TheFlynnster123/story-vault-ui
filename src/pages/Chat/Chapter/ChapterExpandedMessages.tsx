import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Loader } from "@mantine/core";
import { d } from "../../../app/Dependencies/Dependencies";
import { ChatEntry } from "../ChatEntries/ChatEntry";
import { ChapterMessageButtons } from "../ChatMessageButtons/ChapterMessageButtons";

const DetailsContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const MessagesSection = styled.div``;

const MessagesLabel = styled.div`
  font-weight: 600;
  color: rgba(255, 187, 0, 0.9);
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

interface ChapterExpandedDetailsProps {
  chatId: string;
  chapterId: string;
}

export const ChapterExpandedDetails: React.FC<ChapterExpandedDetailsProps> = ({
  chatId,
  chapterId,
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
      <ActionsSection>
        <ChapterMessageButtons chatId={chatId} chapterId={chapterId} />
      </ActionsSection>

      <MessagesSection>
        <MessagesLabel>📚 Chapter Messages</MessagesLabel>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
            No messages in this chapter
          </div>
        ) : (
          messages.map((msg) => (
            <ChatEntry
              key={msg.id}
              chatId={chatId}
              message={msg}
              isLastMessage={false}
            />
          ))
        )}
      </MessagesSection>
    </DetailsContainer>
  );
};
