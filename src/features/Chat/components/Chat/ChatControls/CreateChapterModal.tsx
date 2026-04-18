import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { RiSparklingLine } from "react-icons/ri";
import { VscRefresh } from "react-icons/vsc";

interface CreateChapterModalProps {
  opened: boolean;
  title: string;
  summary: string;
  isGeneratingTitle: boolean;
  isCreating: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onGenerateTitle: () => void;
  onGenerate: () => void;
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
  onGenerateTitle,
  onGenerate,
  onSubmit,
  onCancel,
}) => {
  const canGenerate = !!title.trim() && !isGeneratingTitle && !isCreating;
  const canCreate =
    !!title.trim() && !!summary.trim() && !isGeneratingTitle && !isCreating;

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
          Create a new chapter to summarize the story so far. Click "Generate"
          to workshop the summary with the AI, or enter a summary manually and
          click "Create Chapter".
        </Text>

        <Group align="flex-end" gap="xs">
          <TextInput
            label="Chapter Title"
            placeholder="Enter a title for this chapter..."
            value={title}
            onChange={(e) => onTitleChange(e.currentTarget.value)}
            required
            style={{ flex: 1 }}
          />
          <Tooltip label="Generate title with AI">
            <ActionIcon
              variant="light"
              color="yellow"
              size="input-sm"
              onClick={onGenerateTitle}
              loading={isGeneratingTitle}
              aria-label="Generate title with AI"
            >
              <RiSparklingLine size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Textarea
          label="Chapter Summary (optional for Generate)"
          placeholder="Enter a summary or click Generate to workshop one with the AI..."
          value={summary}
          onChange={(e) => onSummaryChange(e.currentTarget.value)}
          minRows={8}
          autosize
        />

        <Stack gap={4} align="flex-end" mt="md">
          {!title.trim() && (
            <Text size="xs" c="red">
              Enter a chapter title before generating
            </Text>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onCancel}
              disabled={isCreating || isGeneratingTitle}
            >
              Cancel
            </Button>
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
              loading={isCreating}
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
