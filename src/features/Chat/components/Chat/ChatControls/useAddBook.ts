import { useState, useEffect, useMemo } from "react";
import { d } from "../../../../../services/Dependencies";
import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";

interface UseAddBookParams {
  chatId: string;
}

const getChapterIdsInRange = (
  chapters: ChapterChatMessage[],
  startId: string,
  endId: string | null,
): string[] => {
  if (!endId) return [startId];

  const startIdx = chapters.findIndex((ch) => ch.id === startId);
  const endIdx = chapters.findIndex((ch) => ch.id === endId);
  if (startIdx === -1 || endIdx === -1) return [];

  const minIdx = Math.min(startIdx, endIdx);
  const maxIdx = Math.max(startIdx, endIdx);
  return chapters.slice(minIdx, maxIdx + 1).map((ch) => ch.id);
};

export const useAddBook = ({ chatId }: UseAddBookParams) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [startChapterId, setStartChapterId] = useState<string | null>(null);
  const [endChapterId, setEndChapterId] = useState<string | null>(null);
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

  const selectedChapterIds = useMemo(
    () =>
      startChapterId
        ? getChapterIdsInRange(chapters, startChapterId, endChapterId)
        : [],
    [chapters, startChapterId, endChapterId],
  );

  const getSelectedChapterSummaries = (): string[] => {
    return selectedChapterIds
      .map((id) => chapters.find((ch) => ch.id === id))
      .filter(Boolean)
      .map((ch) => ch!.content || "");
  };

  const handleOpenModal = async () => {
    setShowModal(true);
    setStartChapterId(null);
    setEndChapterId(null);
    setTitle("");
    setSummary("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTitle("");
    setSummary("");
    setStartChapterId(null);
    setEndChapterId(null);
  };

  const handleChapterClick = (chapterId: string) => {
    if (!startChapterId) {
      setStartChapterId(chapterId);
      setEndChapterId(null);
    } else if (endChapterId) {
      setStartChapterId(chapterId);
      setEndChapterId(null);
    } else if (startChapterId === chapterId) {
      setStartChapterId(null);
    } else {
      setEndChapterId(chapterId);
    }
  };

  const handleClearSelection = () => {
    setStartChapterId(null);
    setEndChapterId(null);
  };

  const handleGenerateSummary = async () => {
    const chapterSummaries = getSelectedChapterSummaries();
    if (chapterSummaries.length === 0) return;

    try {
      const [generatedTitle, generatedSummary] = await Promise.all([
        d.BookGenerationService(chatId).generateBookTitle(chapterSummaries),
        d.BookGenerationService(chatId).generateBookSummary(chapterSummaries),
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
    startChapterId,
    endChapterId,
    isGenerating: bookGeneration?.IsLoading || false,
    setTitle,
    setSummary,
    handleOpenModal,
    handleCloseModal,
    handleChapterClick,
    handleClearSelection,
    handleGenerateSummary,
    handleSubmit,
  };
};
