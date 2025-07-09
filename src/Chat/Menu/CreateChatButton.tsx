import React, { useState } from "react";
import { ChatSettingsDialog } from "../ChatSettingsDialog";
import type { ChatSettings } from "../../models/ChatSettings";
import { v4 as uuidv4 } from "uuid";
import { useUpdateChatSettingsMutation } from "../../hooks/queries/useChatSettingsQuery";

interface ICreateChatButtonProps {
  onChatCreated: (chatId: string) => void;
}

export const CreateChatButton: React.FC<ICreateChatButtonProps> = ({
  onChatCreated,
}) => {
  const [showChatSettingsDialog, setShowChatSettingsDialog] =
    useState<boolean>(false);

  const updateChatSettingsMutation = useUpdateChatSettingsMutation();

  const handleSettingsCreate = async (settings: ChatSettings) => {
    try {
      const newChatId = uuidv4();

      await updateChatSettingsMutation.mutateAsync({
        chatId: newChatId,
        settings,
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
        onCreate={handleSettingsCreate}
      />
    </>
  );
};
