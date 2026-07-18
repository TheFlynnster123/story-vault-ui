import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
} from "@mantine/core";
import { VscEdit, VscRefresh } from "react-icons/vsc";
import { RiChat3Line } from "react-icons/ri";
import type { ChapterCreationView } from "./useAddChapter";
import { ChapterEditorModal } from "../ChatEntries/Chapter/ChapterEditorModal";

interface CreateChapterModalProps {
  opened: boolean;
  view?: ChapterCreationView;
  title: string;
  summary: string;
  isGenerating: boolean;
  isCreating: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onGenerate: () => void;
  onDiscuss?: () => void;
  onManual?: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDiscard: () => void;
}

export const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  opened,
  view = "editor",
  title,
  summary,
  isGenerating,
  isCreating,
  onTitleChange,
  onSummaryChange,
  onGenerate,
  onDiscuss,
  onManual,
  onSubmit,
  onCancel,
  onDiscard,
}) => {
  const isBusy = isGenerating || isCreating;
  const showChoices = view === "choices";

  if (!showChoices) {
    return (
      <ChapterEditorModal
        opened={opened}
        heading="Review Chapter"
        description="Review and finalize the chapter before saving it."
        submitLabel="Create Chapter"
        title={title}
        summary={summary}
        isSubmitting={isCreating}
        onTitleChange={onTitleChange}
        onSummaryChange={onSummaryChange}
        onSubmit={onSubmit}
        onClose={onCancel}
        onDiscard={onDiscard}
      />
    );
  }

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
          Choose how you want to prepare this chapter.
        </Text>
        <Button
          variant="light"
          color="yellow"
          onClick={onGenerate}
          disabled={isBusy}
          leftSection={<VscRefresh size={18} />}
          justify="flex-start"
        >
          Generate
        </Button>
        <Text size="xs" c="dimmed">
          Generate in the background and keep chatting while you wait.
        </Text>
        <Button
          variant="light"
          color="yellow"
          onClick={onDiscuss}
          disabled={!onDiscuss || isBusy}
          leftSection={<RiChat3Line size={18} />}
          justify="flex-start"
        >
          Discuss
        </Button>
        <Text size="xs" c="dimmed">
          Talk through the chapter with the AI before drafting it.
        </Text>
        <Button
          variant="light"
          color="blue"
          onClick={onManual}
          disabled={!onManual || isBusy}
          leftSection={<VscEdit size={18} />}
          justify="flex-start"
        >
          Manual
        </Button>
        <Text size="xs" c="dimmed">
          Start with a blank title and summary.
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
