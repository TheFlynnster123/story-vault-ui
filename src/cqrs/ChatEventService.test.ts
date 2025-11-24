import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatEventService } from "./ChatEventService";
import { d } from "../app/Dependencies/Dependencies";
import type { ChatEvent } from "./events/ChatEvent";

// Mock dependencies
vi.mock("../app/Dependencies/Dependencies");

describe("ChatEventService", () => {
  let mockChatEventStore: any;
  let mockUserChatProjection: any;
  let mockLLMChatProjection: any;
  const testChatId = "test-chat-123";

  beforeEach(() => {
    mockChatEventStore = {
      getChatEvents: vi.fn().mockResolvedValue([]),
      addChatEvent: vi.fn().mockResolvedValue(true),
    };

    mockUserChatProjection = {
      process: vi.fn(),
    };

    mockLLMChatProjection = {
      process: vi.fn(),
    };

    // Mock the dependency injection
    vi.mocked(d.ChatEventStore).mockReturnValue(mockChatEventStore);
    vi.mocked(d.UserChatProjection).mockReturnValue(mockUserChatProjection);
    vi.mocked(d.LLMChatProjection).mockReturnValue(mockLLMChatProjection);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---- Initialization Tests ----
  describe("Initialize", () => {
    it("should load events from store on first initialization", async () => {
      const events = createMockEvents(3);
      mockChatEventStore.getChatEvents.mockResolvedValue(events);

      const service = new ChatEventService(testChatId);
      await service.Initialize();

      expect(mockChatEventStore.getChatEvents).toHaveBeenCalledWith(testChatId);
      expect(service.Events).toEqual(events);
    });

    it("should not initialize more than once", async () => {
      const service = new ChatEventService(testChatId);

      await service.Initialize();
      await service.Initialize();
      await service.Initialize();

      expect(mockChatEventStore.getChatEvents).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent initialization calls without race conditions", async () => {
      const events = createMockEvents(3);
      mockChatEventStore.getChatEvents.mockResolvedValue(events);

      const service = new ChatEventService(testChatId);

      // Call Initialize() multiple times concurrently (simulating React's behavior)
      const promises = [
        service.Initialize(),
        service.Initialize(),
        service.Initialize(),
      ];

      await Promise.all(promises);

      // Should only fetch events once
      expect(mockChatEventStore.getChatEvents).toHaveBeenCalledTimes(1);

      // Should only process events once (not duplicate)
      expect(mockUserChatProjection.process).toHaveBeenCalledTimes(3);
      expect(mockLLMChatProjection.process).toHaveBeenCalledTimes(3);
    });

    it("should replay all events to UserChatProjection during initialization", async () => {
      const events = createMockEvents(5);
      mockChatEventStore.getChatEvents.mockResolvedValue(events);

      const service = new ChatEventService(testChatId);
      await service.Initialize();

      expect(mockUserChatProjection.process).toHaveBeenCalledTimes(5);
      events.forEach((event, index) => {
        expect(mockUserChatProjection.process).toHaveBeenNthCalledWith(
          index + 1,
          event
        );
      });
    });

    it("should replay all events to LLMChatProjection during initialization", async () => {
      const events = createMockEvents(5);
      mockChatEventStore.getChatEvents.mockResolvedValue(events);

      const service = new ChatEventService(testChatId);
      await service.Initialize();

      expect(mockLLMChatProjection.process).toHaveBeenCalledTimes(5);
      events.forEach((event, index) => {
        expect(mockLLMChatProjection.process).toHaveBeenNthCalledWith(
          index + 1,
          event
        );
      });
    });

    it("should handle empty event history gracefully", async () => {
      mockChatEventStore.getChatEvents.mockResolvedValue([]);

      const service = new ChatEventService(testChatId);
      await service.Initialize();

      expect(mockUserChatProjection.process).not.toHaveBeenCalled();
      expect(mockLLMChatProjection.process).not.toHaveBeenCalled();
      expect(service.Events).toEqual([]);
    });

    it("should handle store errors during initialization", async () => {
      mockChatEventStore.getChatEvents.mockRejectedValue(
        new Error("Store error")
      );

      const service = new ChatEventService(testChatId);

      await expect(service.Initialize()).rejects.toThrow("Store error");
    });
  });

  // ---- AddChatEvent Tests ----
  describe("AddChatEvent", () => {
    it("should process event through both projections", async () => {
      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const event = createMessageCreatedEvent();
      await service.AddChatEvent(event);

      expect(mockUserChatProjection.process).toHaveBeenCalledWith(event);
      expect(mockLLMChatProjection.process).toHaveBeenCalledWith(event);
    });

    it("should persist event to the store", async () => {
      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const event = createMessageCreatedEvent();
      await service.AddChatEvent(event);

      expect(mockChatEventStore.addChatEvent).toHaveBeenCalledWith(
        testChatId,
        event
      );
    });

    it("should auto-initialize if not already initialized", async () => {
      const service = new ChatEventService(testChatId);

      const event = createMessageCreatedEvent();
      await service.AddChatEvent(event);

      expect(mockChatEventStore.getChatEvents).toHaveBeenCalledWith(testChatId);
    });

    it("should process event before persisting to store", async () => {
      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const event = createMessageCreatedEvent();
      await service.AddChatEvent(event);

      // Verify order: projections process before store is called
      const userProjectionCall =
        mockUserChatProjection.process.mock.invocationCallOrder[0];
      const llmProjectionCall =
        mockLLMChatProjection.process.mock.invocationCallOrder[0];
      const storeCall =
        mockChatEventStore.addChatEvent.mock.invocationCallOrder[0];

      expect(userProjectionCall).toBeLessThan(storeCall);
      expect(llmProjectionCall).toBeLessThan(storeCall);
    });

    it("should handle store persistence errors", async () => {
      mockChatEventStore.addChatEvent.mockRejectedValue(
        new Error("Persistence error")
      );

      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const event = createMessageCreatedEvent();

      await expect(service.AddChatEvent(event)).rejects.toThrow(
        "Persistence error"
      );
    });

    it("should handle multiple events in sequence", async () => {
      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const events = createMockEvents(3);

      for (const event of events) {
        await service.AddChatEvent(event);
      }

      // +3 from initialization (empty array), +3 from adding
      expect(mockUserChatProjection.process).toHaveBeenCalledTimes(3);
      expect(mockLLMChatProjection.process).toHaveBeenCalledTimes(3);
      expect(mockChatEventStore.addChatEvent).toHaveBeenCalledTimes(3);
    });
  });

  // ---- Edge Cases ----
  describe("Edge Cases", () => {
    it("should handle different event types", async () => {
      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const messageEvent = createMessageCreatedEvent();
      const editEvent = createMessageEditedEvent();
      const deleteEvent = createMessageDeletedEvent();

      await service.AddChatEvent(messageEvent);
      await service.AddChatEvent(editEvent);
      await service.AddChatEvent(deleteEvent);

      expect(mockUserChatProjection.process).toHaveBeenCalledTimes(3);
      expect(mockLLMChatProjection.process).toHaveBeenCalledTimes(3);
    });

    it("should handle chapter events", async () => {
      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const chapterEvent = createChapterCreatedEvent();

      await service.AddChatEvent(chapterEvent);

      expect(mockUserChatProjection.process).toHaveBeenCalledWith(chapterEvent);
      expect(mockLLMChatProjection.process).toHaveBeenCalledWith(chapterEvent);
    });

    it("should maintain event order during initialization", async () => {
      const events = [
        createMessageCreatedEvent("msg-1"),
        createMessageCreatedEvent("msg-2"),
        createMessageCreatedEvent("msg-3"),
      ];
      mockChatEventStore.getChatEvents.mockResolvedValue(events);

      const service = new ChatEventService(testChatId);
      await service.Initialize();

      // Verify events processed in order
      for (let i = 0; i < events.length; i++) {
        expect(mockUserChatProjection.process).toHaveBeenNthCalledWith(
          i + 1,
          events[i]
        );
        expect(mockLLMChatProjection.process).toHaveBeenNthCalledWith(
          i + 1,
          events[i]
        );
      }
    });

    it("should use correct chatId for all operations", async () => {
      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const event = createMessageCreatedEvent();
      await service.AddChatEvent(event);

      expect(d.UserChatProjection).toHaveBeenCalledWith(testChatId);
      expect(d.LLMChatProjection).toHaveBeenCalledWith(testChatId);
      expect(mockChatEventStore.getChatEvents).toHaveBeenCalledWith(testChatId);
      expect(mockChatEventStore.addChatEvent).toHaveBeenCalledWith(
        testChatId,
        event
      );
    });

    it("should handle rapid consecutive event additions", async () => {
      const service = new ChatEventService(testChatId);
      await service.Initialize();

      const events = createMockEvents(10);
      const promises = events.map((event) => service.AddChatEvent(event));

      await Promise.all(promises);

      expect(mockChatEventStore.addChatEvent).toHaveBeenCalledTimes(10);
    });
  });

  // ---- Helper Functions ----

  function createMockEvents(count: number): ChatEvent[] {
    return Array.from({ length: count }, (_, i) =>
      createMessageCreatedEvent(`msg-${i}`)
    );
  }

  function createMessageCreatedEvent(messageId?: string): ChatEvent {
    return {
      type: "MessageCreated",
      messageId: messageId || `msg-${Date.now()}`,
      role: "user",
      content: "Test message content",
    };
  }

  function createMessageEditedEvent(): ChatEvent {
    return {
      type: "MessageEdited",
      messageId: "msg-edit-1",
      newContent: "Edited content",
    };
  }

  function createMessageDeletedEvent(): ChatEvent {
    return {
      type: "MessageDeleted",
      messageId: "msg-delete-1",
    };
  }

  function createChapterCreatedEvent(): ChatEvent {
    return {
      type: "ChapterCreated",
      chapterId: "chapter-1",
      title: "Chapter Title",
      summary: "Chapter summary",
      coveredMessageIds: ["msg-1", "msg-2"],
    };
  }
});
