import React, { useState } from "react";
import { useDeleteChatMutation } from "../../../hooks/queries/useChatSettings";
import { Button, Modal, Group, Text } from "@mantine/core";
import { RiDeleteBinLine } from "react-icons/ri";
import { ChatHistoryAPI } from "../../../clients/ChatHistoryAPI";

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
      await new ChatHistoryAPI().deleteChat(chatId);

      onDeleteSuccess();
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  return (
    <>
      <Button
        color="red"
        variant="outline"
        onClick={() => setIsConfirmOpen(true)}
        leftSection={<RiDeleteBinLine />}
      >
        Delete Chat
      </Button>
      <Modal
        opened={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Deletion"
      >
        <Text>
          Are you sure you want to delete this chat? This action cannot be
          undone.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setIsConfirmOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  );
};
