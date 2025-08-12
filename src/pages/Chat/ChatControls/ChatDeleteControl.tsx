import React, { useState } from "react";
import { useDeleteChatMutation } from "../../../hooks/queries/useChatSettings";
import { ConfirmModal } from "../../../components/ConfirmModal";

interface ChatDeleteControlProps {
  chatId: string;
  onDeleteSuccess: () => void;
}

export const ChatDeleteControl: React.FC<ChatDeleteControlProps> = ({
  chatId,
  onDeleteSuccess,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const deleteChatMutation = useDeleteChatMutation();

  const handleDelete = async () => {
    try {
      await deleteChatMutation.mutateAsync(chatId);
      onDeleteSuccess();
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
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this chat? This action cannot be undone."
      />
    </>
  );
};
