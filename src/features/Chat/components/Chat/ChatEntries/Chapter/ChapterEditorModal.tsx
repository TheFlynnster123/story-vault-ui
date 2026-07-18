import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";

interface ChapterEditorModalProps {
  opened: boolean;
  heading: string;
  description: string;
  submitLabel: string;
  title: string;
  summary: string;
  isSubmitting?: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onDiscard?: () => void;
}

export const ChapterEditorModal: React.FC<ChapterEditorModalProps> = ({
  opened,
  heading,
  description,
  submitLabel,
  title,
  summary,
  isSubmitting = false,
  onTitleChange,
  onSummaryChange,
  onSubmit,
  onClose,
  onDiscard,
}) => {
  const canSubmit = !!title.trim() && !!summary.trim() && !isSubmitting;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={heading}
      size="xl"
      style={{ height: "100%" }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
        <TextInput
          label="Chapter Title"
          placeholder="Enter a title for this chapter..."
          value={title}
          onChange={(event) => onTitleChange(event.currentTarget.value)}
          required
        />
        <Textarea
          label="Chapter Summary"
          placeholder="Enter the chapter summary..."
          value={summary}
          onChange={(event) => onSummaryChange(event.currentTarget.value)}
          minRows={12}
          autosize
          required
        />
        <Group justify="flex-end" mt="md">
          {onDiscard && (
            <Button
              variant="subtle"
              color="red"
              onClick={onDiscard}
              disabled={isSubmitting}
            >
              Discard Draft
            </Button>
          )}
          <Button variant="default" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button
            color="blue"
            onClick={onSubmit}
            disabled={!canSubmit}
            loading={isSubmitting}
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
