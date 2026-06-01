import React from "react";
import { useNavigate } from "react-router-dom";
import { CreateBookModal } from "../ChatControls/CreateBookModal";
import { useAddBook } from "../ChatControls/useAddBook";
import { CompressToBookButton } from "./CompressToBookButton";

interface BookSectionProps {
  chatId: string;
}

export const BookSection: React.FC<BookSectionProps> = ({ chatId }) => {
  const navigate = useNavigate();
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
    handleSelectionChange,
    handleGenerateTitle,
    handleSubmit,
  } = useAddBook({ chatId });

  const onGenerate = async () => {
    if (!title.trim() || selectedChapterIds.length === 0) return;

    const params = new URLSearchParams();
    params.set("title", title);
    selectedChapterIds.forEach((id) => params.append("chapterId", id));

    handleCloseModal();
    navigate(`/chat/${chatId}/book/discuss?${params.toString()}`);
  };

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
        onSelectionChange={handleSelectionChange}
        onGenerateTitle={handleGenerateTitle}
        onGenerate={onGenerate}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </>
  );
};
