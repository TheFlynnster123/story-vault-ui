import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatService } from "../ChatService";
import { d } from "../../Dependencies";

// Mock dependencies
vi.mock("../../Dependencies");

describe("ChatService - DeleteMessageAndAllBelow", () => {
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
    it("should get messages from UserChatProjection", async () => {
      const messages = createMockMessages(5);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-2");

      expect(d.UserChatProjection).toHaveBeenCalledWith(testChatId);
      expect(mockUserChatProjection.GetMessages).toHaveBeenCalled();
    });

    it("should find message index correctly", async () => {
      const messages = createMockMessages(5);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-2");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("MessagesDeleted");
      // Should delete msg-2, msg-3, msg-4
      expect(calledEvent.messageIds).toHaveLength(3);
    });

    it("should delete all messages from index to end", async () => {
      const messages = createMockMessages(5);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-2");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.messageIds).toEqual(["msg-2", "msg-3", "msg-4"]);
    });

    it("should create MessagesDeleted event with correct message IDs", async () => {
      const messages = createMockMessages(3);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-1");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("MessagesDeleted");
      expect(calledEvent.messageIds).toContain("msg-1");
      expect(calledEvent.messageIds).toContain("msg-2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle deleting the first message (deletes all)", async () => {
      const messages = createMockMessages(5);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-0");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.messageIds).toHaveLength(5);
      expect(calledEvent.messageIds).toEqual([
        "msg-0",
        "msg-1",
        "msg-2",
        "msg-3",
        "msg-4",
      ]);
    });

    it("should handle deleting the last message (deletes only that one)", async () => {
      const messages = createMockMessages(5);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-4");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.messageIds).toHaveLength(1);
      expect(calledEvent.messageIds).toEqual(["msg-4"]);
    });

    it("should handle deleting non-existent message (index -1)", async () => {
      const messages = createMockMessages(3);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("non-existent");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      // When findIndex returns -1, slice(-1) returns the last element
      expect(calledEvent.messageIds).toHaveLength(1);
      expect(calledEvent.messageIds).toEqual(["msg-2"]);
    });

    it("should handle empty message list", async () => {
      mockUserChatProjection.GetMessages.mockReturnValue([]);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-1");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.messageIds).toHaveLength(0);
      expect(calledEvent.messageIds).toEqual([]);
    });

    it("should handle single message list", async () => {
      const messages = createMockMessages(1);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-0");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.messageIds).toHaveLength(1);
      expect(calledEvent.messageIds).toEqual(["msg-0"]);
    });
  });

  describe("Integration", () => {
    it("should call ChatEventService.AddChatEvent once", async () => {
      const messages = createMockMessages(3);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-1");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
    });

    it("should preserve message order in deletion event", async () => {
      const messages = [
        createMessage("msg-a"),
        createMessage("msg-b"),
        createMessage("msg-c"),
      ];
      mockUserChatProjection.GetMessages.mockReturnValue(messages);

      const service = new ChatService(testChatId);
      await service.DeleteMessageAndAllBelow("msg-b");

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.messageIds).toEqual(["msg-b", "msg-c"]);
    });

    it("should handle errors from UserChatProjection", async () => {
      mockUserChatProjection.GetMessages.mockImplementation(() => {
        throw new Error("Projection error");
      });

      const service = new ChatService(testChatId);

      await expect(service.DeleteMessageAndAllBelow("msg-1")).rejects.toThrow(
        "Projection error"
      );
    });

    it("should handle errors from ChatEventService", async () => {
      const messages = createMockMessages(3);
      mockUserChatProjection.GetMessages.mockReturnValue(messages);
      mockChatEventService.AddChatEvent.mockRejectedValue(
        new Error("Event service error")
      );

      const service = new ChatService(testChatId);

      await expect(service.DeleteMessageAndAllBelow("msg-1")).rejects.toThrow(
        "Event service error"
      );
    });
  });

  // ---- Helper Functions ----

  function createMockMessages(count: number) {
    return Array.from({ length: count }, (_, i) => createMessage(`msg-${i}`));
  }

  function createMessage(id: string) {
    return {
      id,
      content: `Content for ${id}`,
      role: "user",
      type: "message",
      deleted: false,
    };
  }
});
