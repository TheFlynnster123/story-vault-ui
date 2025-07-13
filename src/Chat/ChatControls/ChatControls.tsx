import React, { useState } from "react";
import {
  RiArrowGoBackLine,
  RiBubbleChartLine,
  RiChatSettingsLine,
  RiFileList2Line,
} from "react-icons/ri";
import "./ChatControls.css";
import { ChatSettingsDialog } from "./ChatSettingsDialog/ChatSettingsDialog";
import { StoryNotesDialog } from "./StoryNotesDialog/StoryNotesDialog";

interface ChatControlsProps {
  chatId: string;
  toggleMenu: () => void;
  toggleChatFlowDialog: () => void;
}

export const ChatControls: React.FC<ChatControlsProps> = ({
  chatId,
  toggleMenu,
  toggleChatFlowDialog,
}) => {
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isStoryNotesDialogOpen, setIsStoryNotesDialogOpen] = useState(false);

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
        chatId={chatId}
        isOpen={isSettingsDialogOpen}
        onSubmit={() => setIsSettingsDialogOpen(false)}
        onCancel={() => setIsSettingsDialogOpen(false)}
        onDeleteSuccess={() => {
          setIsSettingsDialogOpen(false);
          toggleMenu();
        }}
      />

      <StoryNotesDialog
        chatId={chatId}
        isOpen={isStoryNotesDialogOpen}
        onCancel={() => setIsStoryNotesDialogOpen(false)}
      />
    </div>
  );
};
