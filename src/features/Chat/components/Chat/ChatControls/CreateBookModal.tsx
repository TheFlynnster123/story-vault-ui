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
} from "@mantine/core";
import {
  RiPlayFill,
  RiStopFill,
  RiArrowDownSLine,
  RiArrowRightSLine,
} from "react-icons/ri";
import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";
import {
  ChapterList,
  ChapterRow,
  ChapterHeader,
  ChapterTitle,
  BoundaryBadge,
  ExpandButton,
  ChapterContent,
} from "./CreateBookModal.styled";

interface CreateBookModalProps {
  opened: boolean;
  title: string;
  summary: string;
  chapters: ChapterChatMessage[];
  selectedChapterIds: string[];
  startChapterId: string | null;
  endChapterId: string | null;
  isGenerating: boolean;
  onTitleChange: (title: string) => void;
  onSummaryChange: (summary: string) => void;
  onChapterClick: (chapterId: string) => void;
  onClearSelection: () => void;
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
  startChapterId,
  endChapterId,
  isGenerating,
  onTitleChange,
  onSummaryChange,
  onChapterClick,
  onClearSelection,
  onGenerateSummary,
  onSubmit,
  onCancel,
}) => {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(),
  );

  const canSubmit =
    title.trim() &&
    summary.trim() &&
    selectedChapterIds.length > 0 &&
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

  const getSelectionHint = (): string => {
    if (!startChapterId)
      return "Click a chapter to set the start of the range.";
    if (!endChapterId)
      return "Click another chapter to set the end of the range.";
    return `${selectedChapterIds.length} chapter${selectedChapterIds.length > 1 ? "s" : ""} selected.`;
  };

  const resolvedStartId = (() => {
    if (!startChapterId) return null;
    if (!endChapterId) return startChapterId;
    const startIdx = chapters.findIndex((ch) => ch.id === startChapterId);
    const endIdx = chapters.findIndex((ch) => ch.id === endChapterId);
    return startIdx <= endIdx ? startChapterId : endChapterId;
  })();

  const resolvedEndId = (() => {
    if (!startChapterId || !endChapterId) return null;
    const startIdx = chapters.findIndex((ch) => ch.id === startChapterId);
    const endIdx = chapters.findIndex((ch) => ch.id === endChapterId);
    return startIdx <= endIdx ? endChapterId : startChapterId;
  })();

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
          {getSelectionHint()}
        </Text>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Select Chapter Range
            </Text>
            {startChapterId && (
              <Button variant="subtle" size="xs" onClick={onClearSelection}>
                Clear Selection
              </Button>
            )}
          </Group>

          {chapters.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No chapters available to compress.
            </Text>
          ) : (
            <ChapterList>
              {chapters.map((chapter) => {
                const isStart = chapter.id === resolvedStartId;
                const isEnd = chapter.id === resolvedEndId;
                const isSelected = selectedChapterIds.includes(chapter.id);
                const isExpanded = expandedChapters.has(chapter.id);

                return (
                  <ChapterRow
                    key={chapter.id}
                    $isSelected={isSelected}
                    $isStart={isStart}
                    $isEnd={isEnd}
                    onClick={() => onChapterClick(chapter.id)}
                  >
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

                      {isStart && (
                        <RiPlayFill
                          size={14}
                          color="var(--mantine-color-green-6)"
                        />
                      )}
                      {isEnd && (
                        <RiStopFill
                          size={14}
                          color="var(--mantine-color-red-6)"
                        />
                      )}

                      <ChapterTitle>📖 {chapter.data.title}</ChapterTitle>

                      {isStart && (
                        <BoundaryBadge $type="start">Start</BoundaryBadge>
                      )}
                      {isEnd && <BoundaryBadge $type="end">End</BoundaryBadge>}
                    </ChapterHeader>

                    <Collapse in={isExpanded}>
                      <ChapterContent>
                        {chapter.content || "No summary available."}
                      </ChapterContent>
                    </Collapse>
                  </ChapterRow>
                );
              })}
            </ChapterList>
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
          <Button color="blue" onClick={onSubmit} disabled={!canSubmit}>
            Create Book
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
