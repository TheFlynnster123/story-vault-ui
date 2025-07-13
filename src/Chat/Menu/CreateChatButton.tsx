import React, { useState } from "react";
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
      <div
        key="create"
        className="chat-menu-create-item"
        onClick={() => setShowChatSettingsDialog(true)}
      >
        Create New Chat
      </div>
      <ChatSettingsDialog
        isOpen={showChatSettingsDialog}
        onCancel={() => setShowChatSettingsDialog(false)}
        onSubmit={handleSettingsCreate}
      />
    </>
  );
};
