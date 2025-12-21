import React from "react";
import { LuBookOpen } from "react-icons/lu";
import type { StoryChatMessage } from "../../../cqrs/UserChatProjection";
import { StoryMessageButtons } from "../ChatMessageButtons/StoryMessageButtons";
import {
  StoryMessageContainer,
  StoryMessageHeader,
  StoryDivider,
  StoryContent,
  StoryButtonContainer,
} from "./StoryMessage.styled";

interface StoryMessageProps {
  chatId: string;
  message: StoryChatMessage;
}

export const StoryMessage: React.FC<StoryMessageProps> = ({
  chatId,
  message,
}) => {
  return (
    <StoryMessageContainer>
      <StoryMessageHeader>
        <LuBookOpen size={20} />
        <span>Story</span>
      </StoryMessageHeader>
      <StoryDivider />
      <StoryContent>{message.content}</StoryContent>
      <StoryButtonContainer>
        <StoryMessageButtons chatId={chatId} />
      </StoryButtonContainer>
    </StoryMessageContainer>
  );
};
