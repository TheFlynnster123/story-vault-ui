import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
} from "@mantine/core";

interface EditBookModalProps {
  opened: boolean;
  title: string;
  summary: string;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const EditBookModal: React.FC<EditBookModalProps> = ({
  opened,
  title,
  summary,
  onTitleChange,
  onSummaryChange,
  onSubmit,
  onCancel,
}) => {
  const canSubmit = title.trim() && summary.trim();

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Edit Book"
      size="xl"
      style={{ height: "100%" }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Edit the book title and summary.
        </Text>

        <TextInput
          label="Book Title"
          placeholder="Enter a title for this book..."
          value={title}
          onChange={(e) => onTitleChange(e.currentTarget.value)}
          required
        />

        <Textarea
          label="Book Summary"
          placeholder="Enter the book summary..."
          value={summary}
          onChange={(e) => onSummaryChange(e.currentTarget.value)}
          minRows={12}
          autosize
          required
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="blue" onClick={onSubmit} disabled={!canSubmit}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
