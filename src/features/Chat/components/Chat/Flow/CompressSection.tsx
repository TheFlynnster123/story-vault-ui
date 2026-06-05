import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddChapter } from "../ChatControls/useAddChapter";
import { useAddBook } from "../ChatControls/useAddBook";
import { CreateChapterModal } from "../ChatControls/CreateChapterModal";
import { CreateBookModal } from "../ChatControls/CreateBookModal";
import { CompressButton } from "./CompressButton";
import { CompressionPickerModal } from "./CompressionPickerModal";

interface CompressSectionProps {
  chatId: string;
}

export const CompressSection: React.FC<CompressSectionProps> = ({ chatId }) => {
  const [pickerOpened, setPickerOpened] = useState(false);
  const navigate = useNavigate();

  const chapter = useAddChapter({ chatId });
  const book = useAddBook({ chatId });

  const onDiscussChapter = async () => {
    const params = new URLSearchParams();
    if (chapter.title.trim()) {
      params.set("title", chapter.title);
    }
    if (chapter.summary.trim()) {
      params.set("summary", chapter.summary);
    }

    chapter.handleCloseModal();
    const query = params.toString();
    navigate(
      query
        ? `/chat/${chatId}/chapter/discuss?${query}`
        : `/chat/${chatId}/chapter/discuss`,
    );
  };

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

      <CreateChapterModal
        opened={chapter.showModal}
        title={chapter.title}
        summary={chapter.summary}
        isGeneratingTitle={chapter.isGeneratingTitle}
        isCreating={chapter.isCreating}
        onTitleChange={chapter.setTitle}
        onSummaryChange={chapter.setSummary}
        onGenerate={chapter.handleGenerate}
        onDiscuss={onDiscussChapter}
        onSubmit={chapter.handleSubmit}
        onCancel={chapter.handleCloseModal}
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
