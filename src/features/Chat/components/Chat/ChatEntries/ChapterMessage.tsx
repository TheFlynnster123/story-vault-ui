import React, { useState } from "react";
import styled from "styled-components";
import { Button } from "@mantine/core";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import "./ChatMessage.styled.ts";
import { Theme } from "../../../../../components/Theme";
import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { ChapterContent } from "./Chapter/ChapterContent.tsx";
import { ChapterExpandedDetails } from "./Chapter/ChapterExpandedMessages.tsx";
import { transparencyColor } from "./transparencyColor";

const MessageContainer = styled.div`
  padding: 1rem;
  background: linear-gradient(
    135deg,
    ${transparencyColor(Theme.chapter.backgroundPrimary)} 0%,
    ${transparencyColor(Theme.chapter.backgroundSecondary)} 100%
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

const TrailingContextBanner = styled.div`
  margin-top: 0.75rem;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.18);
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.78rem;
  line-height: 1.35;
`;

interface ChapterMessageProps {
  chatId: string;
  chapter: ChapterChatMessage;
  isLastMessage?: boolean;
  trailingMessageCount?: number;
}

export const ChapterMessage: React.FC<ChapterMessageProps> = ({
  chatId,
  chapter,
  trailingMessageCount,
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

        {trailingMessageCount !== undefined && trailingMessageCount > 0 && (
          <TrailingContextBanner>
            {trailingMessageCount} prior chapter message
            {trailingMessageCount === 1 ? "" : "s"} are still included in LLM
            context.
          </TrailingContextBanner>
        )}

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

        {isExpanded && (
          <ChapterExpandedDetails chatId={chatId} chapterId={chapter.id} />
        )}
      </MessageContainer>
    </div>
  );
};
