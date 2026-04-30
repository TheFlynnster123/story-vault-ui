import React, { useRef, useState } from "react";
import { RiArrowDownSLine } from "react-icons/ri";
import styled, { keyframes } from "styled-components";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChatEntry } from "./ChatEntries/ChatEntry";
import { useUserChatProjection } from "../../hooks/useUserChatProjection";

interface IChatEntriesList {
  chatId: string;
}

export const ChatEntriesList: React.FC<IChatEntriesList> = ({ chatId }) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { messages } = useUserChatProjection(chatId);
  const [isAtBottom, setIsAtBottom] = useState(true);

  return (
    <ChatEntriesContainer>
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        style={{ height: "100%", width: "100%" }}
        followOutput={false}
        atBottomStateChange={setIsAtBottom}
        itemContent={(index, msg) => (
          <ChatEntry
            key={msg.id}
            chatId={chatId}
            message={msg}
            isLastMessage={index === messages.length - 1}
          />
        )}
        increaseViewportBy={{ top: 800, bottom: 800 }}
        initialTopMostItemIndex={messages.length - 1}
      />

      {messages.length > 0 && (
        <MoreBelowIndicator
          aria-hidden="true"
          data-testid="chat-more-below-indicator"
          $isVisible={!isAtBottom}
        >
          <RiArrowDownSLine size={26} />
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

const moreBelowIndicatorAnimation = keyframes`
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
    opacity: 0.4;
  }

  50% {
    transform: translateX(-50%) translateY(4px);
    opacity: 0.7;
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
  color: rgba(170, 170, 170, 0.36);
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
