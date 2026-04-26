import { useState } from "react";
import {
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Button,
  Group,
  Collapse,
  Checkbox,
  Alert,
} from "@mantine/core";
import { RiArrowDownSLine, RiArrowRightSLine, RiErrorWarningLine } from "react-icons/ri";
import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import { areChapterIdsContiguous } from "./areChapterIdsContiguous";
import {
  ChapterList,
  ChapterHeader,
  ChapterTitle,
  ExpandButton,
  ChapterContent,
  ChapterCheckboxRow,
} from "./CreateBookModal.styled";

interface CreateBookModalProps {
  opened: boolean;
  title: string;
  summary: string;
  chapters: ChapterChatMessage[];
  selectedChapterIds: string[];
  isGenerating: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onSelectionChange: (ids: string[]) => void;
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
  onSelectionChange,
  onGenerateSummary,
  onSubmit,
  onCancel,
}) => {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(),
  );

  const isContiguous = areChapterIdsContiguous(chapters, selectedChapterIds);

  const canSubmit =
    title.trim() &&
    summary.trim() &&
    selectedChapterIds.length > 0 &&
    isContiguous &&
    !isGenerating;

  const toggleExpand = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Compress to Book"
      size="xl"
    >
      <Stack>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Select Chapters
          </Text>

          {chapters.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No chapters available to compress.
            </Text>
          ) : (
            <Checkbox.Group value={selectedChapterIds} onChange={onSelectionChange}>
              <ChapterList>
                {chapters.map((chapter) => {
                  const isExpanded = expandedChapters.has(chapter.id);

                  return (
                    <ChapterCheckboxRow key={chapter.id}>
                      <ChapterHeader>
                        <ExpandButton
                          onClick={(e) => toggleExpand(chapter.id, e)}
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <RiArrowDownSLine size={16} />
                          ) : (
                            <RiArrowRightSLine size={16} />
                          )}
                        </ExpandButton>

                        <Checkbox value={chapter.id} />

                        <ChapterTitle>📖 {chapter.data.title}</ChapterTitle>
                      </ChapterHeader>

                      <Collapse in={isExpanded}>
                        <ChapterContent>
                          {chapter.content || "No summary available."}
                        </ChapterContent>
                      </Collapse>
                    </ChapterCheckboxRow>
                  );
                })}
              </ChapterList>
            </Checkbox.Group>
          )}

          {selectedChapterIds.length > 0 && !isContiguous && (
            <Alert icon={<RiErrorWarningLine />} color="orange" variant="light">
              Selected chapters must be contiguous. Please select a consecutive range.
            </Alert>
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
            disabled={selectedChapterIds.length === 0 || !isContiguous}
            fullWidth
          >
            Generate Summary
          </Button>
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel} disabled={isGenerating}>
            Cancel
          </Button>
          <Button color="blue" onClick={onSubmit} disabled={!canSubmit}>
            Create Book
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
