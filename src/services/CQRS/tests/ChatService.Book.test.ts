import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatService } from "../ChatService";
import { d } from "../../Dependencies";

// Mock dependencies
vi.mock("../../Dependencies");

describe("ChatService - AddBook", () => {
  let mockChatEventService: any;
  let mockUserChatProjection: any;
  const testChatId = "test-chat-123";

  beforeEach(() => {
    mockChatEventService = {
      AddChatEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockUserChatProjection = {
      GetMessages: vi.fn().mockReturnValue([]),
    };

    vi.mocked(d.ChatEventService).mockReturnValue(mockChatEventService);
    vi.mocked(d.UserChatProjection).mockReturnValue(mockUserChatProjection);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AddBook", () => {
    it("should create BookCreated event with title, summary, and coveredChapterIds", async () => {
      const service = new ChatService(testChatId);
      await service.AddBook("Book 1", "Summary", ["ch-1", "ch-2"]);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("BookCreated");
      expect(calledEvent.title).toBe("Book 1");
      expect(calledEvent.summary).toBe("Summary");
      expect(calledEvent.coveredChapterIds).toEqual(["ch-1", "ch-2"]);
    });

    it("should generate unique bookId", async () => {
      const service = new ChatService(testChatId);

      await service.AddBook("Book 1", "Summary 1", ["ch-1"]);
      await service.AddBook("Book 2", "Summary 2", ["ch-2"]);

      const event1 = mockChatEventService.AddChatEvent.mock.calls[0][0];
      const event2 = mockChatEventService.AddChatEvent.mock.calls[1][0];

      expect(event1.bookId).toBeDefined();
      expect(event2.bookId).toBeDefined();
      expect(event1.bookId).not.toBe(event2.bookId);
    });

    it("should call ChatEventService.AddChatEvent", async () => {
      const service = new ChatService(testChatId);
      await service.AddBook("Title", "Summary", ["ch-1"]);

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });

    it("should handle empty coveredChapterIds", async () => {
      const service = new ChatService(testChatId);
      await service.AddBook("Empty Book", "No chapters", []);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredChapterIds).toEqual([]);
    });
  });

  describe("EditBook", () => {
    it("should create BookEdited event with bookId, title, and summary", async () => {
      const service = new ChatService(testChatId);
      await service.EditBook("book-1", "New Title", "New Summary");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("BookEdited");
      expect(calledEvent.bookId).toBe("book-1");
      expect(calledEvent.title).toBe("New Title");
      expect(calledEvent.summary).toBe("New Summary");
    });

    it("should call ChatEventService with correct chatId", async () => {
      const service = new ChatService(testChatId);
      await service.EditBook("book-1", "Title", "Summary");

      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });
  });

  describe("DeleteBook", () => {
    it("should create BookDeleted event with bookId", async () => {
      const service = new ChatService(testChatId);
      await service.DeleteBook("book-1");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("BookDeleted");
      expect(calledEvent.bookId).toBe("book-1");
    });

    it("should call ChatEventService with correct chatId", async () => {
      const service = new ChatService(testChatId);
      await service.DeleteBook("book-1");

      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });
  });

  describe("Error Handling", () => {
    it("should propagate errors from ChatEventService for AddBook", async () => {
      mockChatEventService.AddChatEvent.mockRejectedValue(
        new Error("Event service error"),
      );

      const service = new ChatService(testChatId);
      await expect(
        service.AddBook("Title", "Summary", ["ch-1"]),
      ).rejects.toThrow("Event service error");
    });

    it("should propagate errors from ChatEventService for EditBook", async () => {
      mockChatEventService.AddChatEvent.mockRejectedValue(
        new Error("Event service error"),
      );

      const service = new ChatService(testChatId);
      await expect(
        service.EditBook("book-1", "Title", "Summary"),
      ).rejects.toThrow("Event service error");
    });

    it("should propagate errors from ChatEventService for DeleteBook", async () => {
      mockChatEventService.AddChatEvent.mockRejectedValue(
        new Error("Event service error"),
      );

      const service = new ChatService(testChatId);
      await expect(service.DeleteBook("book-1")).rejects.toThrow(
        "Event service error",
      );
    });
  });
});
