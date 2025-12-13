import { useState } from "react";
import { d } from "../../../app/Dependencies/Dependencies";
import { useChatGeneration } from "../../../hooks/useChatGeneration";

interface UseAddChapterParams {
  chatId: string;
}

export const useAddChapter = ({ chatId }: UseAddChapterParams) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [nextChapterDirection, setNextChapterDirection] = useState("");
  const chatGeneration = useChatGeneration({ chatId });

  const handleOpenModal = async () => {
    setShowModal(true);

    // Automatically generate title when modal opens
    try {
      const generatedTitle = await d
        .ChatGenerationService(chatId)
        .generateChapterTitle();
      if (generatedTitle) {
        setTitle(generatedTitle);
      }
    } catch (error) {
      d.ErrorService().log("Failed to generate chapter title", error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTitle("");
    setSummary("");
    setNextChapterDirection("");
  };

  const handleGenerateSummary = async () => {
    try {
      const generatedSummary = await d
        .ChatGenerationService(chatId)
        .generateChapterSummary();
      if (generatedSummary) {
        setSummary(generatedSummary);
      }
    } catch (error) {
      d.ErrorService().log("Failed to generate chapter summary", error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !summary.trim()) return;

    try {
      await d
        .ChatService(chatId)
        .AddChapter(title, summary, nextChapterDirection || undefined);
      handleCloseModal();
    } catch (error) {
      d.ErrorService().log("Failed to create chapter", error);
    }
  };

  return {
    showModal,
    title,
    summary,
    nextChapterDirection,
    isGenerating: chatGeneration.isLoading,
    setTitle,
    setSummary,
    setNextChapterDirection,
    handleOpenModal,
    handleCloseModal,
    handleGenerateSummary,
    handleSubmit,
  };
};
