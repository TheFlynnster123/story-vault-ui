import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";

export interface ChapterCreationDraft {
  title: string;
  summary: string;
  coveredMessageIds: string[];
  contextSnapshot?: LLMMessage[];
  status: "generating" | "ready" | "failed";
}

export const createChapterDraft = (
  title = "",
  summary = "",
  coveredMessageIds: string[] = [],
): ChapterCreationDraft => ({
  title,
  summary,
  coveredMessageIds,
  status: "ready",
});

export const getChapterMessageIds = (
  messages: { id: string; type: string; deleted?: boolean }[],
): string[] =>
  messages
    .filter(
      (message) =>
        !message.deleted &&
        !["chapter", "story", "note"].includes(message.type),
    )
    .map((message) => message.id);

const getStorageKey = (chatId: string) => `chapter-creation-draft:${chatId}`;
const DRAFT_CHANGED_EVENT = "chapter-creation-draft-changed";

export const saveChapterCreationDraft = (
  chatId: string,
  draft: ChapterCreationDraft,
): boolean => {
  try {
    localStorage.setItem(getStorageKey(chatId), JSON.stringify(draft));
    window.dispatchEvent(
      new CustomEvent(DRAFT_CHANGED_EVENT, { detail: chatId }),
    );
    return true;
  } catch {
    return false;
  }
};

export const getChapterCreationDraft = (
  chatId: string,
): ChapterCreationDraft | undefined => {
  const stored = localStorage.getItem(getStorageKey(chatId));
  if (!stored) return;

  try {
    const draft = JSON.parse(stored) as ChapterCreationDraft;
    if (!isChapterCreationDraft(draft)) return;
    return draft;
  } catch {
    return;
  }
};

export const clearChapterCreationDraft = (chatId: string): boolean => {
  try {
    localStorage.removeItem(getStorageKey(chatId));
    window.dispatchEvent(
      new CustomEvent(DRAFT_CHANGED_EVENT, { detail: chatId }),
    );
    return true;
  } catch {
    return false;
  }
};

export const subscribeToChapterCreationDraft = (
  chatId: string,
  callback: (draft: ChapterCreationDraft | undefined) => void,
): (() => void) => {
  const handleChange = (event: Event) => {
    if ((event as CustomEvent<string>).detail !== chatId) return;
    callback(getChapterCreationDraft(chatId));
  };
  window.addEventListener(DRAFT_CHANGED_EVENT, handleChange);
  return () => window.removeEventListener(DRAFT_CHANGED_EVENT, handleChange);
};

const isChapterCreationDraft = (
  draft: Partial<ChapterCreationDraft>,
): draft is ChapterCreationDraft =>
  typeof draft.title === "string" &&
  typeof draft.summary === "string" &&
  Array.isArray(draft.coveredMessageIds) &&
  draft.coveredMessageIds.every((id) => typeof id === "string") &&
  ["generating", "ready", "failed"].includes(draft.status ?? "") &&
  (draft.contextSnapshot === undefined ||
    (Array.isArray(draft.contextSnapshot) &&
      draft.contextSnapshot.every(
        (message) =>
          typeof message?.role === "string" &&
          typeof message?.content === "string",
      )));
