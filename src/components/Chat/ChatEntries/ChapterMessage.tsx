import React, { useState } from "react";
import styled from "styled-components";
import { Collapse, Button } from "@mantine/core";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import "./ChatMessage.styled.ts";
import { Theme } from "../../Common/Theme.ts";
import type { ChapterChatMessage } from "../../../services/CQRS/UserChatProjection.ts";
import { ChapterContent } from "./Chapter/ChapterContent.tsx";
import { ChapterExpandedDetails } from "./Chapter/ChapterExpandedMessages.tsx";
import { NextChapterDirection } from "./Chapter/NextChapterDirection.tsx";

const MessageContainer = styled.div`
  padding: 1rem;
  background: linear-gradient(
    135deg,
    ${Theme.chapter.backgroundPrimary} 0%,
    ${Theme.chapter.backgroundSecondary} 100%
  );
  border-left: 4px solid ${Theme.chapter.border};
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
  color: ${Theme.chapter.headerText};
  margin-bottom: 0.5rem;
`;

const ExpandButtonContainer = styled.div`
  margin-top: 0.5rem;
`;

interface ChapterMessageProps {
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
