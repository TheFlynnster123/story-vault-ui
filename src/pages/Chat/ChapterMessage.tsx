import React, { useState } from "react";
import styled from "styled-components";
import { Collapse, Button } from "@mantine/core";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import type { ChapterChatMessage } from "../../cqrs/UserChatProjection";
import "./ChatMessage.css";
import { ChapterContent } from "./ChapterContent";
import { ChapterExpandedDetails } from "./ChapterExpandedMessages";

const MessageContainer = styled.div`
  cursor: pointer;
  padding: 1rem;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(168, 85, 247, 0.1) 100%
  );
  border-left: 4px solid rgba(99, 102, 241, 0.5);
  border-radius: 8px;
  margin: 1rem 0;
`;

const ChapterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.1rem;
  color: rgba(99, 102, 241, 1);
  margin-bottom: 0.5rem;
`;

const ExpandButtonContainer = styled.div`
  margin-top: 0.5rem;
`;

export interface ChapterMessageProps {
  chatId: string;
  message: ChapterChatMessage;
  isLastMessage?: boolean;
}

export const ChapterMessage: React.FC<ChapterMessageProps> = ({
  chatId,
  message,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleMessageClick = () => {
    setShowDeleteButtons(!showDeleteButtons);
  };

  return (
    <div className="message-item">
      <MessageContainer onClick={handleMessageClick}>
        <ChapterHeader>📖 {message.data.title}</ChapterHeader>

        <ChapterContent
          chatId={chatId}
          message={message}
          showDeleteButtons={showDeleteButtons}
        />

        <ExpandButtonContainer>
          <Button
            variant="subtle"
            size="xs"
            onClick={handleToggleExpand}
            rightSection={
              isExpanded ? <RiArrowUpSLine /> : <RiArrowDownSLine />
            }
          >
            {isExpanded ? "Hide More Details" : "Show More Details"}
          </Button>
        </ExpandButtonContainer>

        <Collapse in={isExpanded}>
          <ChapterExpandedDetails
            chatId={chatId}
            chapterId={message.id}
            nextChapterDirection={message.data.nextChapterDirection}
          />
        </Collapse>
      </MessageContainer>
    </div>
  );
};
