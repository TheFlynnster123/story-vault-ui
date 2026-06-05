import React from "react";
import { useNavigate } from "react-router-dom";
import { CreateChapterModal } from "../ChatControls/CreateChapterModal";
import { useAddChapter } from "../ChatControls/useAddChapter";
import { CompressToChapterButton } from "./CompressToChapterButton";

interface ChapterSectionProps {
  chatId: string;
}

export const ChapterSection: React.FC<ChapterSectionProps> = ({ chatId }) => {
  const navigate = useNavigate();
  const {
    showModal,
    title,
    summary,
    isGeneratingTitle,
    isCreating,
    setTitle,
    setSummary,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleGenerate,
  } = useAddChapter({ chatId });

  const onDiscuss = async () => {
    const params = new URLSearchParams();
    if (title.trim()) {
      params.set("title", title);
    }
    if (summary.trim()) {
      params.set("summary", summary);
    }

    handleCloseModal();
    const query = params.toString();
    navigate(
      query
        ? `/chat/${chatId}/chapter/discuss?${query}`
        : `/chat/${chatId}/chapter/discuss`,
    );
  };

  return (
    <>
      <CompressToChapterButton onClick={handleOpenModal} />
      <CreateChapterModal
        opened={showModal}
        title={title}
        summary={summary}
        isGeneratingTitle={isGeneratingTitle}
        isCreating={isCreating}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onGenerate={handleGenerate}
        onDiscuss={onDiscuss}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </>
  );
};
