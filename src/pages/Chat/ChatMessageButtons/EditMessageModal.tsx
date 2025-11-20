import { Modal, Stack, Text, Textarea, Button, Group } from "@mantine/core";

interface EditMessageModalProps {
  opened: boolean;
  editedContent: string;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
  opened,
  editedContent,
  onContentChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <Modal opened={opened} onClose={onCancel} title="Edit Message" size="xl">
      <Stack>
        <Textarea
          placeholder="Enter your message..."
          value={editedContent}
          onChange={(e) => onContentChange(e.currentTarget.value)}
          style={{ height: "100%" }}
          autosize
          minRows={6}
          autoFocus
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="blue" onClick={onSubmit}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
