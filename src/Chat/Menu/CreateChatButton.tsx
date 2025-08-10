import React, { useState } from "react";
import styled from "styled-components";
import type { ChatSettings } from "../../models/ChatSettings";
import { v4 as uuidv4 } from "uuid";
import { useSaveChatSettingsMutation } from "../../hooks/queries/useChatSettings";
import { ChatSettingsDialog } from "../ChatControls/ChatSettingsDialog/ChatSettingsDialog";

interface ICreateChatButtonProps {
  onChatCreated: (chatId: string) => void;
}

export const CreateChatButton: React.FC<ICreateChatButtonProps> = ({
  onChatCreated,
}) => {
  const [showChatSettingsDialog, setShowChatSettingsDialog] =
    useState<boolean>(false);

  const updateChatSettingsMutation = useSaveChatSettingsMutation();

  const handleSettingsCreate = async (settings: ChatSettings) => {
    try {
      const newChatId = uuidv4();

      await updateChatSettingsMutation.mutateAsync({
        chatId: newChatId,
        chatSettings: settings,
      });

      setShowChatSettingsDialog(false);

      onChatCreated(newChatId);
    } catch (error) {
      console.error("Failed to create chat with settings:", error);
    }
  };

  return (
    <>
      <StyledCreateChatButton
        key="create"
        onClick={() => setShowChatSettingsDialog(true)}
      >
        Create New Chat
      </StyledCreateChatButton>
      <ChatSettingsDialog
        isOpen={showChatSettingsDialog}
        onCancel={() => setShowChatSettingsDialog(false)}
        onSubmit={handleSettingsCreate}
      />
    </>
  );
};

const StyledCreateChatButton = styled.div`
  padding: 10px 15px;
  margin-bottom: 1rem;
  border-radius: 5px;
  cursor: pointer;
  color: #007bff;
  transition: background-color 0.2s ease-in-out;
  background-color: rgba(0, 0, 0, 0.7);
  position: relative;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  text-align: center;

  &:hover {
    background-color: black;
  }
`;
