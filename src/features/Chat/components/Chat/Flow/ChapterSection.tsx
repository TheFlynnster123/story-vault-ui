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
    handleGenerateTitle,
    handleSubmit,
    handleGenerate,
  } = useAddChapter({ chatId });

  const onGenerate = async () => {
    const chapterId = await handleGenerate();
    if (chapterId) {
      navigate(`/chat/${chatId}/chapter/${chapterId}/discuss`);
    }
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
        onGenerateTitle={handleGenerateTitle}
        onGenerate={onGenerate}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </>
  );
};
