import { useState } from "react";
import { Button } from "@mantine/core";
import { RiDeleteBin6Line } from "react-icons/ri";
import { useChatCache } from "../../../hooks/useChatCache";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface DeleteAllBelowButtonProps {
  chatId: string;
  messageId: string;
}

export const DeleteAllBelowButton: React.FC<DeleteAllBelowButtonProps> = ({
  chatId,
  messageId,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const { getDeletePreview, deleteMessagesAfterIndex } = useChatCache(chatId);

  const getMessageCount = () => {
    return getDeletePreview ? getDeletePreview(messageId).messageCount : 0;
  };

  const handleConfirm = () => {
    deleteMessagesAfterIndex(messageId);
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        size="xs"
        variant="light"
        color="red"
        leftSection={<RiDeleteBin6Line size={14} />}
        onClick={() => setShowConfirm(true)}
        styles={{
          root: {
            backgroundColor: "rgba(250, 82, 82, 0.25)",
            "&:hover": {
              backgroundColor: "rgba(250, 82, 82, 0.35)",
            },
          },
        }}
      >
        Delete All Below
      </Button>

      <DeleteConfirmModal
        opened={showConfirm}
        deleteType="fromHere"
        messageCount={getMessageCount()}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
