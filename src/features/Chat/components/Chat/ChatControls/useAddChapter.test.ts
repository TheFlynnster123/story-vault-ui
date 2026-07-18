import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifications } from "@mantine/notifications";
import { d } from "../../../../../services/Dependencies";
import {
  getChapterCreationDraft,
  saveChapterCreationDraft,
} from "../../../services/ChapterCreationDraft";
import { useAddChapter } from "./useAddChapter";

vi.mock("../../../../../services/Dependencies");
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: vi.fn(),
    update: vi.fn(),
    hide: vi.fn(),
  },
}));

const CHAT_ID = "chat-1";
const GENERATED_DRAFT = {
  title: "Generated title",
  summary: "Generated summary",
};
const LLM_MESSAGES = [
  { id: "message-1", role: "user", content: "Start" },
  { id: "message-2", role: "assistant", content: "Continue" },
];

describe("useAddChapter", () => {
  const generation = {
    IsLoading: false,
    subscribe: vi.fn(() => vi.fn()),
    generateChapterDraft: vi.fn(),
  };
  const addChapter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    generation.IsLoading = false;
    generation.generateChapterDraft.mockResolvedValue(GENERATED_DRAFT);
    vi.mocked(d.ChapterGenerationService).mockReturnValue(generation as never);
    vi.mocked(d.UserChatProjection).mockReturnValue({
      GetMessages: vi.fn(() => [
        { id: "message-1", type: "user", deleted: false },
        { id: "deleted", type: "assistant", deleted: true },
        { id: "note-1", type: "note", deleted: false },
        { id: "message-2", type: "assistant", deleted: false },
      ]),
    } as never);
    vi.mocked(d.LLMChatProjection).mockReturnValue({
      GetMessages: vi.fn(() => LLM_MESSAGES),
    } as never);
    vi.mocked(d.ChatService).mockReturnValue({
      AddChapter: addChapter.mockResolvedValue("chapter-1"),
    } as never);
    vi.mocked(d.ErrorService).mockReturnValue({ log: vi.fn() } as never);
  });

  const renderChapterCreation = () =>
    renderHook(() => useAddChapter({ chatId: CHAT_ID }));

  it("opens manual creation in the shared blank editor", () => {
    const { result } = renderChapterCreation();

    act(() => result.current.handleManual());

    expect(result.current.view).toBe("editor");
    expect(result.current.showModal).toBe(true);
    expect(result.current.title).toBe("");
    expect(result.current.summary).toBe("");
  });

  it("restores a discussed draft without interrupting the chat", () => {
    saveChapterCreationDraft(CHAT_ID, {
      title: "Discussed title",
      summary: "Discussed summary",
      coveredMessageIds: ["message-1"],
      status: "ready",
    });

    const { result } = renderChapterCreation();

    expect(result.current.showModal).toBe(false);
    expect(result.current.pendingDraftStatus).toBe("ready");

    act(() => result.current.handlePendingDraft());

    expect(result.current.showModal).toBe(true);
    expect(result.current.title).toBe("Discussed title");
  });

  it("generates from an immutable snapshot without opening the editor", async () => {
    const { result } = renderChapterCreation();

    act(() => result.current.handleGenerate());
    await act(async () => {});

    expect(generation.generateChapterDraft).toHaveBeenCalledWith(LLM_MESSAGES);
    expect(result.current.showModal).toBe(false);
    expect(result.current.pendingDraftStatus).toBe("ready");
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ position: "top-right", loading: true }),
    );
    expect(notifications.update).toHaveBeenCalledWith(
      expect.objectContaining({ position: "top-right", color: "green" }),
    );
  });

  it("persists editor changes until explicit discard", () => {
    const { result, unmount } = renderChapterCreation();

    act(() => result.current.openEditor("Draft", "Summary"));
    act(() => result.current.setTitle("Revised"));
    act(() => result.current.handleCloseModal());
    unmount();

    const restored = renderChapterCreation();
    expect(restored.result.current.pendingDraftStatus).toBe("ready");
    expect(restored.result.current.title).toBe("Revised");

    act(() => restored.result.current.handleDiscard());
    expect(getChapterCreationDraft(CHAT_ID)).toBeUndefined();
  });

  it("compresses only the captured messages", async () => {
    const { result } = renderChapterCreation();

    act(() => result.current.handleGenerate());
    await act(async () => {});
    await act(async () => result.current.handleSubmit());

    expect(addChapter).toHaveBeenCalledWith(
      "Generated title",
      "Generated summary",
      ["message-1", "message-2"],
    );
    expect(getChapterCreationDraft(CHAT_ID)).toBeUndefined();
  });

  it("retains a failed generation for retry", async () => {
    generation.generateChapterDraft.mockRejectedValueOnce(new Error("failed"));
    const { result } = renderChapterCreation();

    act(() => result.current.handleGenerate());
    await act(async () => {});

    expect(result.current.pendingDraftStatus).toBe("failed");
    expect(notifications.hide).toHaveBeenCalled();

    act(() => result.current.handlePendingDraft());
    await act(async () => {});

    expect(generation.generateChapterDraft).toHaveBeenCalledTimes(2);
    expect(result.current.pendingDraftStatus).toBe("ready");
  });
});
