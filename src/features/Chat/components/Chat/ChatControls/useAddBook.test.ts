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

  it("generates a book title from selected chapter summaries", async () => {
    mockBookGenerationService.generateBookTitle.mockResolvedValue(
      "Generated title",
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
      await result.current.handleGenerateTitle();
    });

    await waitFor(() => {
      expect(result.current.title).toBe("Generated title");
    });

    expect(mockBookGenerationService.generateBookTitle).toHaveBeenCalledWith([
      "Summary 1",
    ]);
    expect(mockBookGenerationService.generateBookSummary).not.toHaveBeenCalled();
  });

  it("logs title generation failures", async () => {
    const titleError = new Error("title failed");
    mockBookGenerationService.generateBookTitle.mockRejectedValue(titleError);

    const useAddBook = await importHook();
    const { result } = renderHook(() => useAddBook({ chatId: CHAT_ID }));

    await act(async () => {
      await result.current.handleOpenModal();
    });

    act(() => {
      result.current.handleSelectionChange(["chapter-1"]);
    });

    await act(async () => {
      await result.current.handleGenerateTitle();
    });

    expect(result.current.title).toBe("");
    expect(mockBookGenerationService.generateBookTitle).toHaveBeenCalledWith([
      "Summary 1",
    ]);
    expect(mockErrorLog).toHaveBeenCalledWith(
      "Failed to generate book title",
      titleError,
    );
  });
});
