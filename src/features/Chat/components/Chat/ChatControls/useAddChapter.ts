import { useState, useEffect } from "react";
import { d } from "../../../../../services/Dependencies";

interface UseAddChapterParams {
  chatId: string;
}

export const useAddChapter = ({ chatId }: UseAddChapterParams) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [, forceUpdate] = useState({});
  const chapterGeneration = d.ChapterGenerationService(chatId);

  useEffect(() => {
    return chapterGeneration?.subscribe(() => forceUpdate({}));
  }, [chapterGeneration]);

  const handleOpenModal = async () => {
    setShowModal(true);

    // Automatically generate title and summary when modal opens
    try {
      const [generatedTitle, generatedSummary] = await Promise.all([
        d.ChapterGenerationService(chatId).generateChapterTitle(),
        d.ChapterGenerationService(chatId).generateChapterSummary(),
      ]);

      if (generatedTitle) {
        setTitle(generatedTitle);
      }
      if (generatedSummary) {
        setSummary(generatedSummary);
      }
    } catch (error) {
      d.ErrorService().log("Failed to generate chapter title/summary", error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTitle("");
    setSummary("");
  };

  const handleGenerateSummary = async () => {
    try {
      const generatedSummary = await d
        .ChapterGenerationService(chatId)
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
      await d.ChatService(chatId).AddChapter(title, summary);
      handleCloseModal();
    } catch (error) {
      d.ErrorService().log("Failed to create chapter", error);
    }
  };

  const handleDiscuss = async (): Promise<string | undefined> => {
    if (!title.trim() || !summary.trim()) return undefined;

    try {
      const chapterId = await d.ChatService(chatId).AddChapter(title, summary);
      handleCloseModal();
      return chapterId;
    } catch (error) {
      d.ErrorService().log("Failed to create chapter for discussion", error);
      return undefined;
    }
  };

  return {
    showModal,
    title,
    summary,
    isGenerating: chapterGeneration?.IsLoading || false,
    setTitle,
    setSummary,
    handleOpenModal,
    handleCloseModal,
    handleGenerateSummary,
    handleSubmit,
    handleDiscuss,
  };
};
