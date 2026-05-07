import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { d } from "../../../../../services/Dependencies";
import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";

vi.mock("../../../../../services/Dependencies");

const CHAT_ID = "chat-123";

const createChapter = (id: string, summary: string): ChapterChatMessage =>
  ({
    id,
    type: "chapter",
    content: summary,
    data: { title: `Chapter ${id}` },
  }) as unknown as ChapterChatMessage;

const createBookGenerationService = () => ({
  IsLoading: false,
  subscribe: vi.fn().mockReturnValue(vi.fn()),
  generateBookTitle: vi.fn(),
  generateBookSummary: vi.fn(),
});

describe("useAddBook", () => {
  const mockErrorLog = vi.fn();
  const mockGetMessages = vi.fn();
  let mockBookGenerationService: ReturnType<typeof createBookGenerationService>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookGenerationService = createBookGenerationService();
    mockGetMessages.mockReturnValue([createChapter("chapter-1", "Summary 1")]);

    vi.mocked(d.BookGenerationService).mockReturnValue(
      mockBookGenerationService as unknown as ReturnType<
        typeof d.BookGenerationService
      >,
    );
    vi.mocked(d.UserChatProjection).mockReturnValue(
      {
        GetMessages: mockGetMessages,
      } as unknown as ReturnType<typeof d.UserChatProjection>,
    );
    vi.mocked(d.ErrorService).mockReturnValue(
      { log: mockErrorLog } as unknown as ReturnType<typeof d.ErrorService>,
    );
  });

  const importHook = async () => {
    const mod = await import("./useAddBook");
    return mod.useAddBook;
  };

  it("keeps the generated summary when title generation fails", async () => {
    const titleError = new Error("title failed");
    mockBookGenerationService.generateBookTitle.mockRejectedValue(titleError);
    mockBookGenerationService.generateBookSummary.mockResolvedValue(
      "Generated summary",
    );

    const useAddBook = await importHook();
    const { result } = renderHook(() => useAddBook({ chatId: CHAT_ID }));

    await act(async () => {
      await result.current.handleOpenModal();
    });

    act(() => {
      result.current.handleSelectionChange(["chapter-1"]);
    });

    await act(async () => {
      await result.current.handleGenerateSummary();
    });

    await waitFor(() => {
      expect(result.current.summary).toBe("Generated summary");
    });

    expect(result.current.title).toBe("");
    expect(mockBookGenerationService.generateBookTitle).toHaveBeenCalledWith([
      "Summary 1",
    ]);
    expect(mockBookGenerationService.generateBookSummary).toHaveBeenCalledWith([
      "Summary 1",
    ]);
    expect(mockErrorLog).toHaveBeenCalledWith(
      "Failed to generate book title",
      titleError,
    );
  });

  it("keeps the generated title when summary generation fails", async () => {
    const summaryError = new Error("summary failed");
    mockBookGenerationService.generateBookTitle.mockResolvedValue(
      "Generated title",
    );
    mockBookGenerationService.generateBookSummary.mockRejectedValue(summaryError);

    const useAddBook = await importHook();
    const { result } = renderHook(() => useAddBook({ chatId: CHAT_ID }));

    await act(async () => {
      await result.current.handleOpenModal();
    });

    act(() => {
      result.current.handleSelectionChange(["chapter-1"]);
    });

    await act(async () => {
      await result.current.handleGenerateSummary();
    });

    await waitFor(() => {
      expect(result.current.title).toBe("Generated title");
    });

    expect(result.current.summary).toBe("");
    expect(mockErrorLog).toHaveBeenCalledWith(
      "Failed to generate book summary",
      summaryError,
    );
  });
});
