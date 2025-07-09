import React, { useState } from "react";
import { ChatSettingsDialog } from "./ChatSettingsDialog";
import { useChatSettings } from "../hooks/useChatSettings";
import { RiChatSettingsLine } from "react-icons/ri";
import type { ChatSettings } from "../models/ChatSettings";
import "./ChatControls.css";

interface ChatControlsProps {
  chatId: string;
  toggleMenu: () => void;
  onSettingsUpdated: (updatedSettings: ChatSettings) => void;
  currentChatSettings?: ChatSettings | null;
}

export const ChatControls: React.FC<ChatControlsProps> = ({
  chatId,
  toggleMenu,
  onSettingsUpdated,
  currentChatSettings,
}) => {
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const { createChatSettings } = useChatSettings();

  const handleSettingsSubmit = async (settings: {
    chatTitle: string;
    context: string;
    backgroundPhotoBase64?: string;
  }) => {
    try {
      await createChatSettings(chatId, settings);
      setIsSettingsDialogOpen(false);
      onSettingsUpdated(settings);
    } catch (error) {
      console.error("Failed to update chat settings:", error);
    }
  };

  return (
    <div className="chat-controls">
      <button
        className="chat-controls-button menu-button"
        onClick={toggleMenu}
        title="Back to Menu"
      >
        ←
      </button>

      <button
        className="chat-controls-button settings-button"
        onClick={() => setIsSettingsDialogOpen(true)}
        title="Chat Settings"
      >
        <RiChatSettingsLine />
      </button>

      <ChatSettingsDialog
        isOpen={isSettingsDialogOpen}
        onCreate={handleSettingsSubmit}
        onCancel={() => setIsSettingsDialogOpen(false)}
        initialValues={currentChatSettings || undefined}
      />
    </div>
  );
};
