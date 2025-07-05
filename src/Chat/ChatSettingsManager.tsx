import React, { useState } from "react";
import { ChatSettingsDialog } from "./ChatSettingsDialog";
import { useChatSettings } from "../hooks/useChatSettings";
import type { ChatSettings } from "../models/ChatSettingsNote";

interface ChatSettingsManagerProps {
  onChatCreated: (chatId: string) => void;
  generateChatId: () => string;
}

export const ChatSettingsManager: React.FC<ChatSettingsManagerProps> = ({
  onChatCreated,
  generateChatId,
}) => {
  const [showSettingsDialog, setShowSettingsDialog] = useState<boolean>(false);
  const { createChatSettings } = useChatSettings();

  const handleCreateChatClick = () => {
    setShowSettingsDialog(true);
  };

  const handleSettingsCancel = () => {
    setShowSettingsDialog(false);
  };

  const handleSettingsCreate = async (settings: ChatSettings) => {
    try {
      const newChatId = generateChatId();
      await createChatSettings(newChatId, settings);
      setShowSettingsDialog(false);
      onChatCreated(newChatId);
    } catch (error) {
      console.error("Failed to create chat with settings:", error);
      // TODO: Show error message to user
    }
  };

  return (
    <>
      <div
        key="create"
        className="chat-menu-create-item"
        onClick={handleCreateChatClick}
      >
        Create New Chat
      </div>
      <ChatSettingsDialog
        isOpen={showSettingsDialog}
        onCancel={handleSettingsCancel}
        onCreate={handleSettingsCreate}
      />
    </>
  );
};
