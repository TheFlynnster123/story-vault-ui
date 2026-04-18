import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
} from "@mantine/core";
import { RiChat3Line } from "react-icons/ri";

interface CreateChapterModalProps {
  opened: boolean;
  title: string;
  summary: string;
  isGenerating: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onGenerateSummary: () => void;
  onDiscuss: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  opened,
  title,
  summary,
  isGenerating,
  onTitleChange,
  onSummaryChange,
  onGenerateSummary,
  onDiscuss,
  onSubmit,
  onCancel,
}) => {
  const isFormValid = title.trim() && summary.trim() && !isGenerating;

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
          <Group grow>
            <Button
              variant="light"
              onClick={onGenerateSummary}
              loading={isGenerating}
            >
              Generate Summary
            </Button>
            <Button
              variant="light"
              color="yellow"
              onClick={onDiscuss}
              disabled={!isFormValid}
              leftSection={<RiChat3Line size={14} />}
            >
              Discuss this Summary
            </Button>
          </Group>
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel} disabled={isGenerating}>
            Cancel
          </Button>
          <Button color="blue" onClick={onSubmit} disabled={!isFormValid}>
            Create Chapter
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
