import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
} from "@mantine/core";

interface CreateChapterModalProps {
  opened: boolean;
  title: string;
  summary: string;
  nextChapterDirection: string;
  isGenerating: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onNextChapterDirectionChange: (direction: string) => void;
  onGenerateSummary: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  opened,
  title,
  summary,
  nextChapterDirection,
  isGenerating,
  onTitleChange,
  onSummaryChange,
  onNextChapterDirectionChange,
  onGenerateSummary,
  onSubmit,
  onCancel,
}) => {
  const canSubmit = title.trim() && summary.trim() && !isGenerating;

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Create Chapter"
      size="xl"
      style={{ height: "100%" }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Create a new chapter to summarize the story so far.
        </Text>

        <TextInput
          label="Chapter Title"
          placeholder="Enter a title for this chapter..."
          value={title}
          onChange={(e) => onTitleChange(e.currentTarget.value)}
          required
        />

        <Stack gap="xs">
          <Textarea
            label="Chapter Summary"
            placeholder="Click 'Generate Summary' or enter manually..."
            value={summary}
            onChange={(e) => onSummaryChange(e.currentTarget.value)}
            minRows={12}
            autosize
            required
          />
          <Button
            variant="light"
            onClick={onGenerateSummary}
            loading={isGenerating}
            fullWidth
          >
            Generate Summary
          </Button>
        </Stack>

        <Textarea
          label="Next Chapter Direction (Optional)"
          placeholder="Enter guidance for where the next chapter should go..."
          value={nextChapterDirection}
          onChange={(e) => onNextChapterDirectionChange(e.currentTarget.value)}
          minRows={4}
          autosize
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel} disabled={isGenerating}>
            Cancel
          </Button>
          <Button color="blue" onClick={onSubmit} disabled={!canSubmit}>
            Create Chapter
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
