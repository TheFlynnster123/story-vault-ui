import React from "react";
import { CreateBookModal } from "../ChatControls/CreateBookModal";
import { useAddBook } from "../ChatControls/useAddBook";
import { CompressToBookButton } from "./CompressToBookButton";

interface BookSectionProps {
  chatId: string;
}

export const BookSection: React.FC<BookSectionProps> = ({ chatId }) => {
  const {
    showModal,
    title,
    summary,
    chapters,
    selectedChapterIds,
    startChapterId,
    endChapterId,
    isGenerating,
    setTitle,
    setSummary,
    handleOpenModal,
    handleCloseModal,
    handleChapterClick,
    handleClearSelection,
    handleGenerateSummary,
    handleSubmit,
  } = useAddBook({ chatId });

  return (
    <>
      <CompressToBookButton onClick={handleOpenModal} />
      <CreateBookModal
        opened={showModal}
        title={title}
        summary={summary}
        chapters={chapters}
        selectedChapterIds={selectedChapterIds}
        startChapterId={startChapterId}
        endChapterId={endChapterId}
        isGenerating={isGenerating}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onChapterClick={handleChapterClick}
        onClearSelection={handleClearSelection}
        onGenerateSummary={handleGenerateSummary}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </>
  );
};
