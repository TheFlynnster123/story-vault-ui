import React from "react";
import { LuBookOpen } from "react-icons/lu";
import {
  StoryMessageContainer,
  StoryMessageHeader,
  StoryDivider,
  StoryContent,
  StoryButtonContainer,
} from "./StoryMessage.styled";
import type { StoryChatMessage } from "../../../services/CQRS/UserChatProjection";
import { StoryMessageButtons } from "./ChatEntryButtons/StoryMessageButtons";

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
