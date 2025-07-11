import React, { useState } from "react";
import {
  RiArrowGoBackLine,
  RiBubbleChartLine,
  RiChatSettingsLine,
  RiFileList2Line,
} from "react-icons/ri";
import type { ChatSettings } from "../../models/ChatSettings";
import { useCreateChatSettingsMutation } from "../../hooks/queries/useChatSettingsQuery";
import "./ChatControls.css";
import { ChatSettingsDialog } from "./ChatSettingsDialog/ChatSettingsDialog";
import { StoryNotesDialog } from "./StoryNotesDialog/StoryNotesDialog";

interface ChatControlsProps {
  chatId: string;
  toggleMenu: () => void;
  onSettingsUpdated: (updatedSettings: ChatSettings) => void;
  currentChatSettings?: ChatSettings | null;
  toggleChatFlowDialog: () => void;
}

export const ChatControls: React.FC<ChatControlsProps> = ({
  chatId,
  toggleMenu,
  onSettingsUpdated,
  currentChatSettings,
  toggleChatFlowDialog,
}) => {
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isStoryNotesDialogOpen, setIsStoryNotesDialogOpen] = useState(false);
  const createChatSettingsMutation = useCreateChatSettingsMutation();

  const handleSettingsSubmit = async (settings: {
    chatTitle: string;
    context: string;
    backgroundPhotoBase64?: string;
  }) => {
    try {
      await createChatSettingsMutation.mutateAsync({ chatId, settings });
      setIsSettingsDialogOpen(false);
      onSettingsUpdated(settings);
    } catch (error) {
      console.error("Failed to create chat settings:", error);
    }
  };

  return (
    <div className="chat-controls">
      <button
        className="chat-controls-button menu-button"
        onClick={toggleMenu}
        title="Back to Menu"
      >
        <RiArrowGoBackLine />
      </button>

      <button
        className="chat-controls-button settings-button"
        onClick={() => setIsSettingsDialogOpen(true)}
        title="Chat Settings"
      >
        <RiChatSettingsLine />
      </button>

      <button
        className="chat-controls-button story-notes-button"
        onClick={() => setIsStoryNotesDialogOpen(true)}
        title="Story Notes"
      >
        <RiFileList2Line />
      </button>

      <button
        className="chat-controls-button chat-flow-dialog-button"
        onClick={toggleChatFlowDialog}
        title="Chat Flow"
      >
        <RiBubbleChartLine />
      </button>

      <ChatSettingsDialog
        isOpen={isSettingsDialogOpen}
        onCreate={handleSettingsSubmit}
        onCancel={() => setIsSettingsDialogOpen(false)}
        initialValues={currentChatSettings || undefined}
      />

      <StoryNotesDialog
        isOpen={isStoryNotesDialogOpen}
        onCancel={() => setIsStoryNotesDialogOpen(false)}
      />
    </div>
  );
};
