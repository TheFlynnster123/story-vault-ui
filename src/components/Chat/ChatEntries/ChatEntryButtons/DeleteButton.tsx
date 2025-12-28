import { useState } from "react";
import { Button } from "@mantine/core";
import { RiDeleteBinLine } from "react-icons/ri";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { d } from "../../../../services/Dependencies";

interface DeleteButtonProps {
  chatId: string;
  messageId: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  chatId,
  messageId,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    d.ChatService(chatId).DeleteMessage(messageId);
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        size="xs"
        variant="light"
        color="red"
        leftSection={<RiDeleteBinLine size={14} />}
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
        Delete
      </Button>

      <DeleteConfirmModal
        opened={showConfirm}
        deleteType="single"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
