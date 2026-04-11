import { useState, useEffect, useMemo } from "react";
import { d } from "../../../../../services/Dependencies";
import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";

interface UseAddBookParams {
  chatId: string;
}

export const useAddBook = ({ chatId }: UseAddBookParams) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [, forceUpdate] = useState({});
  const bookGeneration = d.BookGenerationService(chatId);

  useEffect(() => {
    return bookGeneration?.subscribe(() => forceUpdate({}));
  }, [bookGeneration]);

  const chapters = useMemo((): ChapterChatMessage[] => {
    if (!showModal) return [];
    return d
      .UserChatProjection(chatId)
      .GetMessages()
      .filter((m) => m.type === "chapter") as ChapterChatMessage[];
  }, [chatId, showModal]);

  const getSelectedChapterSummaries = (): string[] => {
    return selectedChapterIds
      .map((id) => chapters.find((ch) => ch.id === id))
      .filter(Boolean)
      .map((ch) => ch!.content || "");
  };

  const handleOpenModal = async () => {
    setShowModal(true);
    setSelectedChapterIds([]);
    setTitle("");
    setSummary("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTitle("");
    setSummary("");
    setSelectedChapterIds([]);
  };

  const handleToggleChapter = (chapterId: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId],
    );
  };

  const handleSelectAll = () => {
    setSelectedChapterIds(chapters.map((ch) => ch.id));
  };

  const handleDeselectAll = () => {
    setSelectedChapterIds([]);
  };

  const handleGenerateSummary = async () => {
    const chapterSummaries = getSelectedChapterSummaries();
    if (chapterSummaries.length === 0) return;

    try {
      const [generatedTitle, generatedSummary] = await Promise.all([
        d
          .BookGenerationService(chatId)
          .generateBookTitle(chapterSummaries),
        d
          .BookGenerationService(chatId)
          .generateBookSummary(chapterSummaries),
      ]);

      if (generatedTitle) setTitle(generatedTitle);
      if (generatedSummary) setSummary(generatedSummary);
    } catch (error) {
      d.ErrorService().log("Failed to generate book summary", error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !summary.trim() || selectedChapterIds.length === 0)
      return;

    try {
      await d
        .ChatService(chatId)
        .AddBook(title, summary, selectedChapterIds);
      handleCloseModal();
    } catch (error) {
      d.ErrorService().log("Failed to create book", error);
    }
  };

  return {
    showModal,
    title,
    summary,
    chapters,
    selectedChapterIds,
    isGenerating: bookGeneration?.IsLoading || false,
    setTitle,
    setSummary,
    handleOpenModal,
    handleCloseModal,
    handleToggleChapter,
    handleSelectAll,
    handleDeselectAll,
    handleGenerateSummary,
    handleSubmit,
  };
};
