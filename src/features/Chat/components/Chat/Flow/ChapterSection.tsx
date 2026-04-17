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
    nextChapterDirection,
    isGenerating,
    setTitle,
    setSummary,
    setNextChapterDirection,
    handleOpenModal,
    handleCloseModal,
    handleGenerateSummary,
    handleSubmit,
    handleDiscuss,
  } = useAddChapter({ chatId });

  const onDiscuss = async () => {
    const chapterId = await handleDiscuss();
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
        nextChapterDirection={nextChapterDirection}
        isGenerating={isGenerating}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onNextChapterDirectionChange={setNextChapterDirection}
        onGenerateSummary={handleGenerateSummary}
        onDiscuss={onDiscuss}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
      />
    </>
  );
};
