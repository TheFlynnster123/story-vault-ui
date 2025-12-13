import React from "react";
import { ChapterModal } from "../ChatControls/ChapterModal";
import { useAddChapter } from "../ChatControls/useAddChapter";
import { CompressToChapterButton } from "./CompressToChapterButton";

interface ChapterSectionProps {
  chatId: string;
}

export const ChapterSection: React.FC<ChapterSectionProps> = ({ chatId }) => {
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
      <CompressToChapterButton onClick={handleOpenModal} />
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
