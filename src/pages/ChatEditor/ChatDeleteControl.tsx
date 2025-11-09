import React, { useState } from "react";
import { useChatDeletion } from "../../queries/useDeleteChat";
import { Button, Modal, Group, Text } from "@mantine/core";
import { RiDeleteBinLine } from "react-icons/ri";
import { d } from "../../app/Dependencies/Dependencies";
import { useNavigate } from "react-router-dom";

interface ChatDeleteControlProps {
  chatId: string;
}

export const ChatDeleteControl: React.FC<ChatDeleteControlProps> = ({
  chatId,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { deleteChat } = useChatDeletion();
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      await deleteChat(chatId);
      navigate("/chat");
    } catch (e) {
      d.ErrorService().log("Failed to delete chat", e);
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
