import React, { useRef, useState } from "react";
import { RiArrowDownSLine } from "react-icons/ri";
import styled, { keyframes } from "styled-components";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChatEntry } from "./ChatEntries/ChatEntry";
import { useUserChatProjection } from "../../hooks/useUserChatProjection";
import { useSystemSettings } from "../../../SystemSettings/hooks/useSystemSettings";
import { DEFAULT_TRAILING_CHAPTER_MESSAGES } from "../../../SystemSettings/services/SystemSettings";
import type { UserChatMessage } from "../../../../services/CQRS/UserChatProjection";

interface IChatEntriesList {
  chatId: string;
}

const INITIAL_CHAT_LOCATION = { index: "LAST" as const, align: "end" as const };

export const ChatEntriesList: React.FC<IChatEntriesList> = ({ chatId }) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { messages } = useUserChatProjection(chatId);
  const { systemSettings } = useSystemSettings();
  const trailingChapterMessages =
    systemSettings?.chapterCompressionSettings?.trailingChapterMessages ??
    DEFAULT_TRAILING_CHAPTER_MESSAGES;
  const trailingCue = getTrailingChapterCue(messages, trailingChapterMessages);
  const [isAtBottom, setIsAtBottom] = useState(true);

  return (
    <ChatEntriesContainer>
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        style={{ height: "100%", width: "100%" }}
        followOutput={false}
        computeItemKey={(_, message) => message.id}
        atBottomStateChange={setIsAtBottom}
        itemContent={(index, msg) => (
          <ChatEntry
            key={msg.id}
            chatId={chatId}
            message={msg}
            isLastMessage={index === messages.length - 1}
            trailingChapterMessageCount={
              trailingCue?.chapterId === msg.id ? trailingCue.count : undefined
            }
          />
        )}
        increaseViewportBy={{ top: 800, bottom: 800 }}
        initialTopMostItemIndex={INITIAL_CHAT_LOCATION}
      />

      {messages.length > 0 && (
        <MoreBelowIndicator
          aria-hidden="true"
          data-testid="chat-more-below-indicator"
          $isVisible={!isAtBottom}
        >
          <RiArrowDownSLine size={30} />
        </MoreBelowIndicator>
      )}
    </ChatEntriesContainer>
  );
};

const ChatEntriesContainer = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
`;

const getTrailingChapterCue = (
  messages: UserChatMessage[],
  trailingChapterMessages: number,
): { chapterId: string; count: number } | undefined => {
  if (trailingChapterMessages <= 0) return undefined;

  const lastChapterIndex = findLastChapterIndex(messages);
  if (lastChapterIndex === -1) return undefined;

  const messagesSinceChapter = messages.slice(lastChapterIndex + 1);
  if (messagesSinceChapter.length >= trailingChapterMessages) return undefined;

  const chapter = messages[lastChapterIndex];
  const coveredMessageIds =
    chapter.type === "chapter" ? chapter.data.coveredMessageIds : [];
  const count = Math.min(trailingChapterMessages, coveredMessageIds.length);

  return count > 0 ? { chapterId: chapter.id, count } : undefined;
};

const findLastChapterIndex = (messages: UserChatMessage[]): number => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === "chapter") return i;
  }
  return -1;
};

const moreBelowIndicatorAnimation = keyframes`
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
    opacity: 0.65;
  }

  50% {
    transform: translateX(-50%) translateY(4px);
    opacity: 0.9;
  }
`;

const MoreBelowIndicator = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  left: 50%;
  bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
  color: rgba(186, 230, 253, 0.9);
  background-color: rgba(15, 23, 42, 0.42);
  border-radius: 999px;
  padding: 0 2px;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  visibility: ${({ $isVisible }) => ($isVisible ? "visible" : "hidden")};
  transform: translateX(-50%)
    translateY(${({ $isVisible }) => ($isVisible ? "0" : "6px")});
  transition:
    opacity 220ms ease-out,
    transform 220ms ease-out,
    visibility 220ms linear;
  animation: ${({ $isVisible }) =>
      $isVisible ? moreBelowIndicatorAnimation : "none"}
    1.8s ease-in-out infinite;
`;
