import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChapterCreation } from "../ChatControls/ChapterCreationContext";
import { useAddBook } from "../ChatControls/useAddBook";
import { CreateBookModal } from "../ChatControls/CreateBookModal";
import { CompressButton } from "./CompressButton";
import { CompressionPickerModal } from "./CompressionPickerModal";

interface CompressSectionProps {
  chatId: string;
}

export const CompressSection: React.FC<CompressSectionProps> = ({ chatId }) => {
  const [pickerOpened, setPickerOpened] = useState(false);
  const navigate = useNavigate();

  const chapter = useChapterCreation();
  const book = useAddBook({ chatId });

  const onGenerateBook = async () => {
    if (!book.title.trim() || book.selectedChapterIds.length === 0) return;

    const params = new URLSearchParams();
    params.set("title", book.title);
    book.selectedChapterIds.forEach((id) => params.append("chapterId", id));

    book.handleCloseModal();
    navigate(`/chat/${chatId}/book/discuss?${params.toString()}`);
  };

  return (
    <>
      <CompressButton onClick={() => setPickerOpened(true)} />

      <CompressionPickerModal
        opened={pickerOpened}
        onClose={() => setPickerOpened(false)}
        onSelectChapter={chapter.handleOpenModal}
        onSelectBook={book.handleOpenModal}
      />


      <CreateBookModal
        opened={book.showModal}
        title={book.title}
        summary={book.summary}
        chapters={book.chapters}
        selectedChapterIds={book.selectedChapterIds}
        isGenerating={book.isGenerating}
        onTitleChange={book.setTitle}
        onSummaryChange={book.setSummary}
        onSelectionChange={book.handleSelectionChange}
        onGenerateTitle={book.handleGenerateTitle}
        onGenerate={onGenerateBook}
        onSubmit={book.handleSubmit}
        onCancel={book.handleCloseModal}
      />
    </>
  );
};
