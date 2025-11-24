import { ActionIcon } from "@mantine/core";
import { RiBookOpenLine } from "react-icons/ri";
import { ChapterModal } from "./ChapterModal";
import { useAddChapter } from "./useAddChapter";

interface AddChapterButtonProps {
  chatId: string;
}

export const AddChapterButton: React.FC<AddChapterButtonProps> = ({
  chatId,
}) => {
  const {
    showModal,
    title,
    summary,
    nextChapterDirection,
    isGenerating,
    setTitle,
    setSummary,
    setNextChapterDirection,
    handleOpenModal,
    handleCloseModal,
    handleGenerateSummary,
    handleSubmit,
  } = useAddChapter({ chatId });

  return (
    <>
      <ActionIcon
        onClick={handleOpenModal}
        variant="gradient"
        title="Add Chapter"
        size="xl"
      >
        <RiBookOpenLine />
      </ActionIcon>

      <ChapterModal
        opened={showModal}
        title={title}
        summary={summary}
        nextChapterDirection={nextChapterDirection}
        isGenerating={isGenerating}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onNextChapterDirectionChange={setNextChapterDirection}
        onGenerateSummary={handleGenerateSummary}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </>
  );
};
