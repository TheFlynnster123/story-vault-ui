import { useCallback, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { d } from "../../../../../services/Dependencies";
import {
  clearChapterCreationDraft,
  createChapterDraft,
  getChapterCreationDraft,
  getChapterMessageIds,
  saveChapterCreationDraft,
  subscribeToChapterCreationDraft,
  type ChapterCreationDraft,
} from "../../../services/ChapterCreationDraft";

interface UseAddChapterParams {
  chatId: string;
}

export type ChapterCreationView = "choices" | "editor";
type ModalView = ChapterCreationView | "closed";

export const useAddChapter = ({ chatId }: UseAddChapterParams) => {
  const [modalView, setModalView] = useState<ModalView>("closed");
  const [draft, setDraft] = useState<ChapterCreationDraft>();
  const [isCreating, setIsCreating] = useState(false);
  const [, refreshGenerationState] = useState({});
  const chapterGeneration = d.ChapterGenerationService(chatId);
  const notificationId = `chapter-generation-${chatId}`;

  const persistDraft = useCallback(
    (nextDraft: ChapterCreationDraft) => {
      setDraft(nextDraft);
      if (!saveChapterCreationDraft(chatId, nextDraft)) {
        d.ErrorService().log("Failed to save the chapter draft");
      }
    },
    [chatId],
  );

  const generateDraft = useCallback(
    async (pendingDraft: ChapterCreationDraft) => {
      if (chapterGeneration.IsLoading || !pendingDraft.contextSnapshot) return;

      persistDraft({ ...pendingDraft, status: "generating" });
      setModalView("closed");
      notifications.show({
        id: notificationId,
        title: "Creating chapter draft",
        message: "You can keep chatting while the draft is generated.",
        position: "top-right",
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });

      try {
        const generated = await chapterGeneration.generateChapterDraft(
          pendingDraft.contextSnapshot,
        );
        if (!generated?.title.trim() || !generated.summary.trim()) {
          throw new Error("The generated chapter draft was incomplete.");
        }

        persistDraft({
          ...pendingDraft,
          title: generated.title.trim(),
          summary: generated.summary.trim(),
          contextSnapshot: undefined,
          status: "ready",
        });
        notifications.update({
          id: notificationId,
          title: "Chapter draft ready",
          message: "Use the chapter control to review it when convenient.",
          position: "top-right",
          color: "green",
          loading: false,
          autoClose: 4000,
          withCloseButton: true,
        });
      } catch (error) {
        persistDraft({ ...pendingDraft, status: "failed" });
        notifications.hide(notificationId);
        d.ErrorService().log("Failed to generate chapter draft", error);
      }
    },
    [chapterGeneration, notificationId, persistDraft],
  );

  useEffect(
    () => chapterGeneration.subscribe(() => refreshGenerationState({})),
    [chapterGeneration],
  );

  useEffect(() => {
    const storedDraft = getChapterCreationDraft(chatId);
    setDraft(storedDraft);
    if (storedDraft?.status === "generating") {
      void generateDraft(storedDraft);
    }
  }, [chatId, generateDraft]);

  useEffect(() => subscribeToChapterCreationDraft(chatId, setDraft), [chatId]);

  const getSnapshot = () => ({
    coveredMessageIds: getChapterMessageIds(
      d.UserChatProjection(chatId).GetMessages(),
    ),
    contextSnapshot: d
      .LLMChatProjection(chatId)
      .GetMessages()
      .map((message) => ({ ...message })),
  });

  const openEditor = (title = "", summary = "") => {
    const nextDraft = {
      ...createChapterDraft(
        title,
        summary,
        getSnapshot().coveredMessageIds,
      ),
    };
    persistDraft(nextDraft);
    setModalView("editor");
  };

  const handleOpenModal = () => setModalView("choices");
  const handleCloseModal = () => setModalView("closed");
  const handleManual = () => openEditor();

  const handleGenerate = () => {
    if (chapterGeneration.IsLoading) return;
    const snapshot = getSnapshot();
    void generateDraft({
      ...createChapterDraft("", "", snapshot.coveredMessageIds),
      contextSnapshot: snapshot.contextSnapshot,
      status: "generating",
    });
  };

  const handlePendingDraft = () => {
    if (!draft || draft.status === "generating") return;
    if (draft.status === "failed") {
      const snapshot = draft.contextSnapshot
        ? draft
        : { ...draft, ...getSnapshot() };
      void generateDraft(snapshot);
      return;
    }
    setModalView("editor");
  };

  const handleDiscard = () => {
    clearChapterCreationDraft(chatId);
    setDraft(undefined);
    setModalView("closed");
  };

  const handleSubmit = async () => {
    if (!draft?.title.trim() || !draft.summary.trim()) return;

    setIsCreating(true);
    try {
      await d.ChatService(chatId).AddChapter(
        draft.title.trim(),
        draft.summary.trim(),
        draft.coveredMessageIds,
      );
      handleDiscard();
    } catch (error) {
      d.ErrorService().log("Failed to create chapter", error);
    } finally {
      setIsCreating(false);
    }
  };

  const updateDraft = (patch: Partial<ChapterCreationDraft>) => {
    if (!draft) return;
    persistDraft({ ...draft, ...patch });
  };

  return {
    showModal: modalView !== "closed",
    view: (modalView === "choices"
      ? "choices"
      : "editor") as ChapterCreationView,
    title: draft?.title ?? "",
    summary: draft?.summary ?? "",
    isGenerating: chapterGeneration.IsLoading,
    isCreating,
    pendingDraftStatus: draft?.status,
    setTitle: (title: string) => updateDraft({ title }),
    setSummary: (summary: string) => updateDraft({ summary }),
    openEditor,
    handleOpenModal,
    handleCloseModal,
    handleManual,
    handleGenerate,
    handlePendingDraft,
    handleDiscard,
    handleSubmit,
  };
};
