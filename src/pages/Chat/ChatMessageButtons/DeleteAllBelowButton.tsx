import { useState } from "react";
import { Button } from "@mantine/core";
import { RiDeleteBin6Line } from "react-icons/ri";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { d } from "../../../app/Dependencies/Dependencies";

interface DeleteAllBelowButtonProps {
  chatId: string;
  messageId: string;
}

export const DeleteAllBelowButton: React.FC<DeleteAllBelowButtonProps> = ({
  chatId,
  messageId,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    d.ChatService(chatId).DeleteMessageAndAllBelow(messageId);
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
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
