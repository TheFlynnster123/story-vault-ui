import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
} from "@mantine/core";

interface EditChapterModalProps {
  opened: boolean;
  title: string;
  summary: string;
  nextChapterDirection: string;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onNextChapterDirectionChange: (direction: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const EditChapterModal: React.FC<EditChapterModalProps> = ({
  opened,
  title,
  summary,
  nextChapterDirection,
  onTitleChange,
  onSummaryChange,
  onNextChapterDirectionChange,
  onSubmit,
  onCancel,
}) => {
  const canSubmit = title.trim() && summary.trim();

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Edit Chapter"
      size="xl"
      style={{ height: "100%" }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Edit the chapter title and summary.
        </Text>

        <TextInput
          label="Chapter Title"
          placeholder="Enter a title for this chapter..."
          value={title}
          onChange={(e) => onTitleChange(e.currentTarget.value)}
          required
        />

        <Textarea
          label="Chapter Summary"
          placeholder="Enter the chapter summary..."
          value={summary}
          onChange={(e) => onSummaryChange(e.currentTarget.value)}
          minRows={12}
          autosize
          required
        />

        <Textarea
          label="Next Chapter Direction (Optional)"
          placeholder="Enter guidance for where the next chapter should go..."
          value={nextChapterDirection}
          onChange={(e) => onNextChapterDirectionChange(e.currentTarget.value)}
          minRows={4}
          autosize
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
