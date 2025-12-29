import { useState } from "react";
import { Button, Modal, Text, Group } from "@mantine/core";
import { RiDeleteBinLine } from "react-icons/ri";
import { d } from "../../../../services/Dependencies";

interface DeleteChapterButtonProps {
  chatId: string;
  chapterId: string;
}

export const DeleteChapterButton: React.FC<DeleteChapterButtonProps> = ({
  chatId,
  chapterId,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    d.ChatService(chatId).DeleteChapter(chapterId);
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

      <Modal
        opened={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <Text>
          Are you sure you want to delete this chapter? The covered messages
          will be restored.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleConfirm}>
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  );
};
