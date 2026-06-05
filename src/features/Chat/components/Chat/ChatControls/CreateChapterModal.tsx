import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
} from "@mantine/core";
import { VscRefresh } from "react-icons/vsc";
import { RiChat3Line } from "react-icons/ri";

interface CreateChapterModalProps {
  opened: boolean;
  title: string;
  summary: string;
  isGeneratingTitle: boolean;
  isCreating: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onGenerate: () => void;
  onDiscuss?: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  opened,
  title,
  summary,
  isGeneratingTitle,
  isCreating,
  onTitleChange,
  onSummaryChange,
  onGenerate,
  onDiscuss,
  onSubmit,
  onCancel,
}) => {
  const isBusy = isGeneratingTitle || isCreating;
  const canGenerate = !isBusy;
  const canCreate =
    !!title.trim() && !!summary.trim() && !isBusy;

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
          Create a new chapter to summarize the story so far. Enter the title
          and summary manually, generate a draft for both fields, or discuss the
          chapter summary before creating it.
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
          placeholder="Enter a summary or click Generate to draft one with the AI..."
          value={summary}
          onChange={(e) => onSummaryChange(e.currentTarget.value)}
          minRows={8}
          autosize
        />

        <Stack gap={4} align="flex-end" mt="md">
          {(!title.trim() || !summary.trim()) && (
            <Text size="xs" c="red">
              Enter a chapter title and summary before creating
            </Text>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onCancel}
              disabled={isBusy}
            >
              Cancel
            </Button>
            {onDiscuss && (
              <Button
                variant="light"
                color="yellow"
                onClick={onDiscuss}
                disabled={isBusy}
                leftSection={<RiChat3Line size={16} />}
              >
                Discuss
              </Button>
            )}
            <Button
              color="blue"
              onClick={onSubmit}
              disabled={!canCreate}
              loading={isCreating}
            >
              Create Chapter
            </Button>
            <Button
              color="yellow"
              onClick={onGenerate}
              disabled={!canGenerate}
              loading={isBusy}
              leftSection={<VscRefresh size={16} />}
            >
              Generate
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Modal>
  );
};
