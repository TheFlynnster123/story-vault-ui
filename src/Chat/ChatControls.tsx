import React, { useState } from "react";
import { ChatSettingsDialog } from "./ChatSettingsDialog";
import { RiArrowGoBackLine, RiChatSettingsLine } from "react-icons/ri";
import type { ChatSettings } from "../models/ChatSettings";
import { useCreateChatSettingsMutation } from "../hooks/queries/useChatSettingsQuery";
import "./ChatControls.css";
import { BsArrowLeft } from "react-icons/bs";

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

      <ChatSettingsDialog
        isOpen={isSettingsDialogOpen}
        onCreate={handleSettingsSubmit}
        onCancel={() => setIsSettingsDialogOpen(false)}
        initialValues={currentChatSettings || undefined}
      />
    </div>
  );
};
