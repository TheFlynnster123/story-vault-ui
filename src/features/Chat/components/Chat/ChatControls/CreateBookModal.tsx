import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
  Checkbox,
} from "@mantine/core";
import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { areChapterIdsContiguous } from "./areChapterIdsContiguous";

interface CreateBookModalProps {
  opened: boolean;
  title: string;
  summary: string;
  chapters: ChapterChatMessage[];
  selectedChapterIds: string[];
  isGenerating: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onToggleChapter: (chapterId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onGenerateSummary: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CreateBookModal: React.FC<CreateBookModalProps> = ({
  opened,
  title,
  summary,
  chapters,
  selectedChapterIds,
  isGenerating,
  onTitleChange,
  onSummaryChange,
  onToggleChapter,
  onSelectAll,
  onDeselectAll,
  onGenerateSummary,
  onSubmit,
  onCancel,
}) => {
  const canSubmit =
    title.trim() &&
    summary.trim() &&
    selectedChapterIds.length > 0 &&
    !isGenerating;

  const hasContiguousSelection = areChapterIdsContiguous(
    chapters,
    selectedChapterIds,
  );

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Compress to Book"
      size="xl"
      style={{ height: "100%" }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Select contiguous chapters to compress into a book summary.
        </Text>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Select Chapters
            </Text>
            <Group gap="xs">
              <Button variant="subtle" size="xs" onClick={onSelectAll}>
                Select All
              </Button>
              <Button variant="subtle" size="xs" onClick={onDeselectAll}>
                Deselect All
              </Button>
            </Group>
          </Group>

          {chapters.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No chapters available to compress.
            </Text>
          ) : (
            chapters.map((chapter) => (
              <Checkbox
                key={chapter.id}
                label={`📖 ${chapter.data.title}`}
                checked={selectedChapterIds.includes(chapter.id)}
                onChange={() => onToggleChapter(chapter.id)}
              />
            ))
          )}

          {selectedChapterIds.length > 0 && !hasContiguousSelection && (
            <Text size="xs" c="red">
              Selected chapters must be contiguous.
            </Text>
          )}
        </Stack>

        <TextInput
          label="Book Title"
          placeholder="Enter a title for this book..."
          value={title}
          onChange={(e) => onTitleChange(e.currentTarget.value)}
          required
        />

        <Stack gap="xs">
          <Textarea
            label="Book Summary"
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
            disabled={selectedChapterIds.length === 0}
            fullWidth
          >
            Generate Summary
          </Button>
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={onSubmit}
            disabled={!canSubmit || !hasContiguousSelection}
          >
            Create Book
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};


