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

  const handleGenerate = async (): Promise<string | undefined> => {
    if (!title.trim()) return undefined;

    setIsCreating(true);
    try {
      const chapterId = await d
        .ChatService(chatId)
        .AddChapter(title, summary.trim() || "");
      handleCloseModal();
      return chapterId;
    } catch (error) {
      d.ErrorService().log("Failed to create chapter for discussion", error);
      return undefined;
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
