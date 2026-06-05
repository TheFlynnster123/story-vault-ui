import { useState, useEffect } from "react";
import { d } from "../../../../../services/Dependencies";

interface UseAddChapterParams {
  chatId: string;
}

export const useAddChapter = ({ chatId }: UseAddChapterParams) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [, forceUpdate] = useState({});
  const chapterGeneration = d.ChapterGenerationService(chatId);

  useEffect(() => {
    return chapterGeneration?.subscribe(() => forceUpdate({}));
  }, [chapterGeneration]);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTitle("");
    setSummary("");
  };

  const handleGenerateTitle = async () => {
    try {
      const generatedTitle = await d
        .ChapterGenerationService(chatId)
        .generateChapterTitle();
      if (generatedTitle) {
        setTitle(generatedTitle);
      }
    } catch (error) {
      d.ErrorService().log("Failed to generate chapter title", error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !summary.trim()) return;

    setIsCreating(true);
    try {
      await d.ChatService(chatId).AddChapter(title, summary);
      handleCloseModal();
    } catch (error) {
      d.ErrorService().log("Failed to create chapter", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const generationService = d.ChapterGenerationService(chatId);
      const generatedTitle = await generationService.generateChapterTitle();
      if (generatedTitle) {
        setTitle(generatedTitle);
      }

      const generatedSummary = await generationService.generateChapterSummary();
      if (generatedSummary) {
        setSummary(generatedSummary);
      }
    } catch (error) {
      d.ErrorService().log("Failed to generate chapter draft", error);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    showModal,
    title,
    summary,
    isGeneratingTitle: chapterGeneration?.IsLoading || false,
    isCreating,
    setTitle,
    setSummary,
    handleOpenModal,
    handleCloseModal,
    handleGenerateTitle,
    handleSubmit,
    handleGenerate,
  };
};
