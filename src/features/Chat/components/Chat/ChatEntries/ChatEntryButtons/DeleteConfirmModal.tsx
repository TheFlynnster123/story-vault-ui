import { Modal, Text, Button, Group } from "@mantine/core";

interface DeleteConfirmModalProps {
  opened: boolean;
  deleteType: "single" | "fromHere";
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  opened,
  deleteType,
  onConfirm,
  onCancel,
}) => {
  const getDeleteConfirmText = () => {
    if (deleteType === "single") {
      return "Are you sure you want to delete this message?";
    }
    return `Are you sure you want to delete this message and all messages below it?`;
  };

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Confirm Deletion"
      size="sm"
    >
      <Text>{getDeleteConfirmText()}</Text>
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm}>
          Delete
        </Button>
      </Group>
    </Modal>
  );
};
