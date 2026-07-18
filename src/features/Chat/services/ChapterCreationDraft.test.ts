import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearChapterCreationDraft,
  createChapterDraft,
  getChapterCreationDraft,
  getChapterMessageIds,
  saveChapterCreationDraft,
  subscribeToChapterCreationDraft,
} from "./ChapterCreationDraft";

const CHAT_ID = "chat-1";

describe("ChapterCreationDraft", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("persists and restores a draft", () => {
    const draft = createChapterDraft("Title", "Summary", ["message-1"]);

    expect(saveChapterCreationDraft(CHAT_ID, draft)).toBe(true);
    expect(getChapterCreationDraft(CHAT_ID)).toEqual(draft);
  });

  it("rejects malformed stored data", () => {
    localStorage.setItem(
      `chapter-creation-draft:${CHAT_ID}`,
      '{"title":"Title"}',
    );

    expect(getChapterCreationDraft(CHAT_ID)).toBeUndefined();
  });

  it("reports storage failures without throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(
      saveChapterCreationDraft(CHAT_ID, createChapterDraft()),
    ).toBe(false);
  });

  it("notifies only subscribers for the changed chat", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToChapterCreationDraft(CHAT_ID, callback);

    saveChapterCreationDraft("another-chat", createChapterDraft());
    saveChapterCreationDraft(CHAT_ID, createChapterDraft("Title"));

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Title" }),
    );
    unsubscribe();
  });

  it("clears a persisted draft", () => {
    saveChapterCreationDraft(CHAT_ID, createChapterDraft("Title"));

    expect(clearChapterCreationDraft(CHAT_ID)).toBe(true);
    expect(getChapterCreationDraft(CHAT_ID)).toBeUndefined();
  });

  it("selects only eligible covered message IDs", () => {
    const result = getChapterMessageIds([
      { id: "message-1", type: "user" },
      { id: "deleted", type: "assistant", deleted: true },
      { id: "chapter-1", type: "chapter" },
      { id: "note-1", type: "note" },
      { id: "message-2", type: "assistant" },
    ]);

    expect(result).toEqual(["message-1", "message-2"]);
  });
});
