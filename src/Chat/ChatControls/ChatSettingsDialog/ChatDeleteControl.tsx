import React, { useState } from "react";
import { ChatHistoryAPI } from "../../../clients/ChatHistoryAPI";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { useChats } from "../../Menu/useChats";

interface ChatDeleteControlProps {
  chatId: string;
  onDeleteSuccess: () => void;
}

export const ChatDeleteControl: React.FC<ChatDeleteControlProps> = ({
  chatId,
  onDeleteSuccess,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { refreshChats } = useChats();

  const handleDelete = async () => {
    try {
      const api = new ChatHistoryAPI();
      const success = await api.deleteChat(chatId);
      if (success) {
        refreshChats();
        onDeleteSuccess();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  return (
    <>
      <button
        className="chat-settings-delete"
        onClick={() => setIsConfirmOpen(true)}
      >
        Delete Chat
      </button>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          handleDelete();
        }}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
      />
    </>
  );
};
