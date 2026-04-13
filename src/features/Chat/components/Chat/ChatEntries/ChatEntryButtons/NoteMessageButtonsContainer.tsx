import { useState } from "react";
import { Stack, Button } from "@mantine/core";
import { RiEdit2Line, RiDeleteBinLine } from "react-icons/ri";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { EditNoteModal } from "./EditNoteModal";
import { d } from "../../../../../../services/Dependencies";
import type { NoteChatMessage } from "../../../../../../services/CQRS/UserChatProjection";

interface NoteMessageButtonsContainerProps {
  chatId: string;
  message: NoteChatMessage;
}

export const NoteMessageButtonsContainer: React.FC<
  NoteMessageButtonsContainerProps
> = ({ chatId, message }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = () => {
    d.ChatService(chatId).DeleteMessage(message.id);
    setShowDeleteConfirm(false);
  };

  return (
    <Stack gap="xs" justify="center">
      <Button
        size="xs"
        variant="light"
        color="cyan"
        leftSection={<RiEdit2Line size={14} />}
        onClick={() => setShowEditModal(true)}
        styles={{
          root: {
            backgroundColor: "rgba(34, 184, 207, 0.25)",
            "&:hover": {
              backgroundColor: "rgba(34, 184, 207, 0.35)",
            },
          },
        }}
      >
        Edit Note
      </Button>

      <Button
        size="xs"
        variant="light"
        color="red"
        leftSection={<RiDeleteBinLine size={14} />}
        onClick={() => setShowDeleteConfirm(true)}
        styles={{
          root: {
            backgroundColor: "rgba(250, 82, 82, 0.25)",
            "&:hover": {
              backgroundColor: "rgba(250, 82, 82, 0.35)",
            },
          },
        }}
      >
        Delete Note
      </Button>

      <EditNoteModal
        chatId={chatId}
        message={message}
        opened={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      <DeleteConfirmModal
        opened={showDeleteConfirm}
        deleteType="single"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Stack>
  );
};
