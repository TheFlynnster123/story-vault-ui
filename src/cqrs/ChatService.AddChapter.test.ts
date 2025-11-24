import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatService } from "./ChatService";
import { d } from "../app/Dependencies/Dependencies";

// Mock dependencies
vi.mock("../app/Dependencies/Dependencies");

describe("ChatService - AddChapter", () => {
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

  describe("Basic Functionality", () => {
    it("should get all messages from UserChatProjection", async () => {
      const messages = createMockMessages(5);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Chapter 1", "Summary");

      expect(d.UserChatProjection).toHaveBeenCalledWith(testChatId);
      expect(mockUserChatProjection.GetMessages).toHaveBeenCalled();
    });

    it("should filter out chapter messages", async () => {
      const messages = [
        createMessage("msg-1", "message"),
        createChapter("chapter-1"),
        createMessage("msg-2", "message"),
      ];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Chapter 2", "Summary");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).not.toContain("chapter-1");
      expect(calledEvent.coveredMessageIds).toContain("msg-1");
      expect(calledEvent.coveredMessageIds).toContain("msg-2");
    });

    it("should filter out deleted messages", async () => {
      const messages = [
        createMessage("msg-1", "message"),
        createDeletedMessage("msg-2"),
        createMessage("msg-3", "message"),
      ];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Chapter 1", "Summary");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).not.toContain("msg-2");
      expect(calledEvent.coveredMessageIds).toContain("msg-1");
      expect(calledEvent.coveredMessageIds).toContain("msg-3");
    });

    it("should include all non-chapter, non-deleted messages in coveredMessageIds", async () => {
      const messages = [
        createMessage("msg-1", "message"),
        createMessage("msg-2", "message"),
        createMessage("msg-3", "message"),
      ];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Chapter 1", "Summary");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).toEqual([
        "msg-1",
        "msg-2",
        "msg-3",
      ]);
    });

    it("should create ChapterCreated event with title, summary, and coveredMessageIds", async () => {
      const messages = createMockMessages(3);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      const title = "Epic Chapter";
      const summary = "This chapter covers important events";

      await service.AddChapter(title, summary);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("ChapterCreated");
      expect(calledEvent.title).toBe(title);
      expect(calledEvent.summary).toBe(summary);
      expect(calledEvent.coveredMessageIds).toBeDefined();
    });

    it("should call ChatEventService.AddChatEvent with correct event", async () => {
      const messages = createMockMessages(2);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Title", "Summary");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ChapterCreated",
          title: "Title",
          summary: "Summary",
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty message history", async () => {
      mockUserChatProjection.GetMessages.mockReturnValue([]);

      const service = new ChatService(testChatId);
      await service.AddChapter("Empty Chapter", "No messages");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).toEqual([]);
    });

    it("should handle message history with only chapters", async () => {
      const messages = [createChapter("ch-1"), createChapter("ch-2")];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("New Chapter", "Only chapters before");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).toEqual([]);
    });

    it("should handle message history with only deleted messages", async () => {
      const messages = [
        createDeletedMessage("msg-1"),
        createDeletedMessage("msg-2"),
      ];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("New Chapter", "Only deleted before");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).toEqual([]);
    });

    it("should handle mixed message types correctly", async () => {
      const messages = [
        createMessage("msg-1", "message"),
        createChapter("ch-1"),
        createMessage("msg-2", "message"),
        createDeletedMessage("msg-3"),
        createMessage("msg-4", "message"),
        createChapter("ch-2"),
        createMessage("msg-5", "message"),
      ];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Complex Chapter", "Mixed types");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).toEqual([
        "msg-1",
        "msg-2",
        "msg-4",
        "msg-5",
      ]);
      expect(calledEvent.coveredMessageIds).not.toContain("ch-1");
      expect(calledEvent.coveredMessageIds).not.toContain("ch-2");
      expect(calledEvent.coveredMessageIds).not.toContain("msg-3");
    });

    it("should preserve message order in coveredMessageIds", async () => {
      const messages = [
        createMessage("msg-a", "message"),
        createMessage("msg-b", "message"),
        createMessage("msg-c", "message"),
      ];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Ordered Chapter", "Order matters");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).toEqual([
        "msg-a",
        "msg-b",
        "msg-c",
      ]);
    });

    it("should handle single message", async () => {
      const messages = [createMessage("msg-1", "message")];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Single Message", "Only one");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).toEqual(["msg-1"]);
    });

    it("should handle very long message history", async () => {
      const messages = createMockMessages(1000);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Long Chapter", "Many messages");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.coveredMessageIds).toHaveLength(1000);
    });
  });

  describe("Integration", () => {
    it("should generate unique chapterId for each chapter", async () => {
      const messages = createMockMessages(2);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);

      await service.AddChapter("Chapter 1", "First");
      await service.AddChapter("Chapter 2", "Second");

      const event1 = mockChatEventService.AddChatEvent.mock.calls[0][0];
      const event2 = mockChatEventService.AddChatEvent.mock.calls[1][0];

      expect(event1.chapterId).toBeDefined();
      expect(event2.chapterId).toBeDefined();
      expect(event1.chapterId).not.toBe(event2.chapterId);
    });

    it("should handle errors from UserChatProjection", async () => {
      mockUserChatProjection.GetMessages.mockImplementation(() => {
        throw new Error("Projection error");
      });

      const service = new ChatService(testChatId);

      await expect(service.AddChapter("Title", "Summary")).rejects.toThrow(
        "Projection error"
      );
    });

    it("should handle errors from ChatEventService", async () => {
      const messages = createMockMessages(2);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);
      mockChatEventService.AddChatEvent.mockRejectedValue(
        new Error("Event service error")
      );

      const service = new ChatService(testChatId);

      await expect(service.AddChapter("Title", "Summary")).rejects.toThrow(
        "Event service error"
      );
    });

    it("should use correct chatId for all operations", async () => {
      const messages = createMockMessages(2);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.AddChapter("Title", "Summary");

      expect(d.UserChatProjection).toHaveBeenCalledWith(testChatId);
      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });
  });

  // ---- Helper Functions ----

  function createMockMessages(count: number) {
    return Array.from({ length: count }, (_, i) =>
      createMessage(`msg-${i}`, "message")
    );
  }

  function createMessage(id: string, type: string) {
    return {
      id,
      content: `Content for ${id}`,
      role: "user",
      type,
      deleted: false,
    };
  }

  function createChapter(id: string) {
    return {
      id,
      content: "Chapter summary",
      role: "system",
      type: "chapter",
      deleted: false,
    };
  }

  function createDeletedMessage(id: string) {
    return {
      id,
      content: "Deleted content",
      role: "user",
      type: "message",
      deleted: true,
    };
  }
});
