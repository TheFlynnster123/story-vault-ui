import React from "react";
import {
  RiArrowGoBackLine,
  RiChatSettingsLine,
  RiFileList2Line,
} from "react-icons/ri";
import { LuBrain } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { ActionIcon, Stack } from "@mantine/core";
import styled from "styled-components";
import { AddChapterButton } from "./AddChapterButton";

interface ChatControlsProps {
  chatId: string;
}

export const ChatControls: React.FC<ChatControlsProps> = ({ chatId }) => {
  const navigate = useNavigate();

  return (
    <ControlsContainer>
      <Stack>
        <ActionIcon
          onClick={() => navigate("/chat")}
          variant="gradient"
          title="Back to Menu"
          size="xl"
        >
          <RiArrowGoBackLine />
        </ActionIcon>

        <ActionIcon
          onClick={() => navigate(`/chat/${chatId}/edit`)}
          variant="gradient"
          title="Chat Settings"
          size="xl"
        >
          <RiChatSettingsLine />
        </ActionIcon>

        <ActionIcon
          onClick={() => navigate(`/chat/${chatId}/notes`)}
          variant="gradient"
          title="Story Notes"
          size="xl"
        >
          <RiFileList2Line />
        </ActionIcon>

        <ActionIcon
          onClick={() => navigate(`/chat/${chatId}/memories`)}
          variant="gradient"
          title="Memories"
          size="xl"
        >
          <LuBrain />
        </ActionIcon>

        <AddChapterButton chatId={chatId} />
      </Stack>
    </ControlsContainer>
  );
};

const ControlsContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  margin: 0.5rem;
`;
