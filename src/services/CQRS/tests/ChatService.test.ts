import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatService } from "../ChatService";
import { d } from "../../Dependencies";

// Mock dependencies
vi.mock("../../Dependencies");

describe("ChatService - General Operations", () => {
  let mockChatEventService: any;
  const testChatId = "test-chat-123";

  beforeEach(() => {
    // FOCUSED MOCK: Only mock ChatEventService for command operations
    mockChatEventService = {
      AddChatEvent: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.ChatEventService).mockReturnValue(mockChatEventService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---- Initialization Tests ----
  describe("Constructor", () => {
    it("should store chatId correctly", () => {
      const service = new ChatService(testChatId);

      expect(service.chatId).toBe(testChatId);
    });

    it("should not require explicit initialization", () => {
      const service = new ChatService(testChatId);

      // Should be ready to use immediately
      expect(service).toBeDefined();
      expect(service.chatId).toBe(testChatId);
    });
  });

  // ---- AddUserMessage Tests ----
  describe("AddUserMessage", () => {
    it("should create MessageCreated event with user role", async () => {
      const service = new ChatService(testChatId);
      const message = "Hello, world!";

      await service.AddUserMessage(message);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("MessageCreated");
      expect(calledEvent.role).toBe("user");
      expect(calledEvent.content).toBe(message);
    });

    it("should call ChatEventService with correct event", async () => {
      const service = new ChatService(testChatId);
      const message = "Test message";

      await service.AddUserMessage(message);

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "MessageCreated",
          role: "user",
          content: message,
        })
      );
    });

    it("should use correct chatId", async () => {
      const service = new ChatService(testChatId);

      await service.AddUserMessage("test");

      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });
  });

  // ---- AddSystemMessage Tests ----
  describe("AddSystemMessage", () => {
    it("should create MessageCreated event with system role", async () => {
      const service = new ChatService(testChatId);
      const message = "System notification";

      await service.AddSystemMessage(message);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("MessageCreated");
      expect(calledEvent.role).toBe("system");
      expect(calledEvent.content).toBe(message);
    });
  });

  // ---- AddAssistantMessage Tests ----
  describe("AddAssistantMessage", () => {
    it("should create MessageCreated event with assistant role", async () => {
      const service = new ChatService(testChatId);
      const message = "Assistant response";

      await service.AddAssistantMessage(message);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("MessageCreated");
      expect(calledEvent.role).toBe("assistant");
      expect(calledEvent.content).toBe(message);
    });

    it("should call ChatEventService with correct event", async () => {
      const service = new ChatService(testChatId);
      const message = "Assistant message";

      await service.AddAssistantMessage(message);

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ---- CreateCivitJob Tests ----
  describe("CreateCivitJob", () => {
    it("should create CivitJobCreated event with jobId and prompt", async () => {
      const service = new ChatService(testChatId);
      const jobId = "job-123";
      const prompt = "Generate image of a cat";

      await service.CreateCivitJob(jobId, prompt);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("CivitJobCreated");
      expect(calledEvent.jobId).toBe(jobId);
      expect(calledEvent.prompt).toBe(prompt);
    });

    it("should call ChatEventService with correct event", async () => {
      const service = new ChatService(testChatId);

      await service.CreateCivitJob("job-456", "test prompt");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ---- EditMessage Tests ----
  describe("EditMessage", () => {
    it("should create MessageEdited event with messageId and newContent", async () => {
      const service = new ChatService(testChatId);
      const messageId = "msg-123";
      const newContent = "Updated content";

      await service.EditMessage(messageId, newContent);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("MessageEdited");
      expect(calledEvent.messageId).toBe(messageId);
      expect(calledEvent.newContent).toBe(newContent);
    });

    it("should call ChatEventService with correct event", async () => {
      const service = new ChatService(testChatId);

      await service.EditMessage("msg-789", "new text");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ---- DeleteMessage Tests ----
  describe("DeleteMessage", () => {
    it("should create MessageDeleted event with messageId", async () => {
      const service = new ChatService(testChatId);
      const messageId = "msg-delete-123";

      await service.DeleteMessage(messageId);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("MessageDeleted");
      expect(calledEvent.messageId).toBe(messageId);
    });

    it("should call ChatEventService with correct event", async () => {
      const service = new ChatService(testChatId);

      await service.DeleteMessage("msg-999");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ---- EditChapter Tests ----
  describe("EditChapter", () => {
    it("should create ChapterEdited event with chapterId, title, and summary", async () => {
      const service = new ChatService(testChatId);
      const chapterId = "chapter-1";
      const title = "Updated Chapter";
      const summary = "Updated summary";

      await service.EditChapter(chapterId, title, summary);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("ChapterEdited");
      expect(calledEvent.chapterId).toBe(chapterId);
      expect(calledEvent.title).toBe(title);
      expect(calledEvent.summary).toBe(summary);
    });

    it("should call ChatEventService with correct event", async () => {
      const service = new ChatService(testChatId);

      await service.EditChapter("ch-1", "Title", "Summary");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ---- DeleteChapter Tests ----
  describe("DeleteChapter", () => {
    it("should create ChapterDeleted event with chapterId", async () => {
      const service = new ChatService(testChatId);
      const chapterId = "chapter-delete-1";

      await service.DeleteChapter(chapterId);

      const calledEvent = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(calledEvent.type).toBe("ChapterDeleted");
      expect(calledEvent.chapterId).toBe(chapterId);
    });

    it("should call ChatEventService with correct event", async () => {
      const service = new ChatService(testChatId);

      await service.DeleteChapter("ch-999");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Edge Cases ----
  describe("Edge Cases", () => {
    it("should handle multiple operations in sequence", async () => {
      const service = new ChatService(testChatId);

      await service.AddUserMessage("msg1");
      await service.AddSystemMessage("msg2");
      await service.AddAssistantMessage("msg3");

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(3);
    });

    it("should use correct chatId across all operations", async () => {
      const service = new ChatService(testChatId);

      await service.AddUserMessage("test");
      await service.EditMessage("msg-1", "new");
      await service.DeleteMessage("msg-2");

      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
      expect(d.ChatEventService).toHaveBeenCalledTimes(3);
    });

    it("should not maintain state between operations", async () => {
      const service = new ChatService(testChatId);

      await service.AddUserMessage("first");
      vi.clearAllMocks();
      await service.AddUserMessage("second");

      // Should be a fresh call, no accumulated state
      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
    });

    it("should propagate errors from ChatEventService", async () => {
      mockChatEventService.AddChatEvent.mockRejectedValue(
        new Error("Service error")
      );

      const service = new ChatService(testChatId);

      await expect(service.AddUserMessage("test")).rejects.toThrow(
        "Service error"
      );
    });
  });
});
