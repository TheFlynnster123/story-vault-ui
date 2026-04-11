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
    isGenerating,
    setTitle,
    setSummary,
    handleOpenModal,
    handleCloseModal,
    handleToggleChapter,
    handleSelectAll,
    handleDeselectAll,
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
        isGenerating={isGenerating}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onToggleChapter={handleToggleChapter}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onGenerateSummary={handleGenerateSummary}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </>
  );
};
