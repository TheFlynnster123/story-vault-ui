import React, { useState } from "react";
import styled from "styled-components";
import { Collapse, Button } from "@mantine/core";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import type { ChapterChatMessage } from "../../../cqrs/UserChatProjection";
import "../ChatMessage.styled.ts";
import { ChapterContent } from "./ChapterContent";
import { ChapterExpandedDetails } from "./ChapterExpandedMessages";
import { NextChapterDirection } from "./NextChapterDirection";

const MessageContainer = styled.div`
  padding: 1rem;
  background: linear-gradient(
    135deg,
    rgba(199, 152, 0, 0.8) 0%,
    rgba(126, 92, 0, 0.8) 100%
  );
  border-left: 4px solid rgba(97, 71, 0, 0.5);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  margin-top: 1rem;
`;

const ChapterHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.1rem;
  color: rgba(58, 52, 1, 1);
  margin-bottom: 0.5rem;
`;

const ExpandButtonContainer = styled.div`
  margin-top: 0.5rem;
`;

export interface ChapterMessageProps {
  chatId: string;
  chapter: ChapterChatMessage;
  isLastMessage?: boolean;
}

export const ChapterMessage: React.FC<ChapterMessageProps> = ({
  chatId,
  chapter,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="message-item">
      <MessageContainer>
        <ChapterHeader>📖 {chapter.data.title}</ChapterHeader>

        <ChapterContent chapter={chapter} />

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
          <ChapterExpandedDetails chatId={chatId} chapterId={chapter.id} />
        </Collapse>
      </MessageContainer>

      <NextChapterDirection chapter={chapter} />
    </div>
  );
};
