import { useState } from "react";
import { Button } from "@mantine/core";
import { RiEdit2Line } from "react-icons/ri";
import { useChatCache } from "../../../hooks/useChatCache";
import { EditMessageModal } from "./EditMessageModal";

interface EditButtonProps {
  chatId: string;
  messageId: string;
}

export const EditButton: React.FC<EditButtonProps> = ({
  chatId,
  messageId,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const { getMessage, editMessage } = useChatCache(chatId);

  const handleOpenModal = () => {
    const message = getMessage(messageId);

    if (message) {
      setEditedContent(message.content);
      setShowModal(true);
    }
  };

  const handleSubmit = () => {
    if (editedContent.trim()) {
      editMessage(messageId, editedContent);
    }
    setShowModal(false);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <>
      <Button
        size="xs"
        variant="light"
        color="cyan"
        leftSection={<RiEdit2Line size={14} />}
        onClick={handleOpenModal}
        styles={{
          root: {
            backgroundColor: "rgba(34, 184, 207, 0.25)",
            "&:hover": {
              backgroundColor: "rgba(34, 184, 207, 0.35)",
            },
          },
        }}
      >
        Edit
      </Button>

      <EditMessageModal
        opened={showModal}
        editedContent={editedContent}
        onContentChange={setEditedContent}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
};
