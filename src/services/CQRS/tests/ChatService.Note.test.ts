import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatService } from "../ChatService";
import { d } from "../../Dependencies";

vi.mock("../../Dependencies");

describe("ChatService - Note Operations", () => {
  let mockChatEventService: any;
  const testChatId = "test-chat-note";

  beforeEach(() => {
    mockChatEventService = {
      AddChatEvent: vi.fn().mockResolvedValue(undefined),
      AddChatEvents: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.ChatEventService).mockReturnValue(mockChatEventService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AddNote", () => {
    it("should emit NoteCreated event", async () => {
      const service = new ChatService(testChatId);

      await service.AddNote("Remember to use formal tone", 10);

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
      const event = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(event.type).toBe("NoteCreated");
    });

    it("should create event with correct content", async () => {
      const service = new ChatService(testChatId);

      await service.AddNote("Use descriptive language", 10);

      const event = getEvent();
      expect(event.content).toBe("Use descriptive language");
    });

    it("should create event with expiration", async () => {
      const service = new ChatService(testChatId);

      await service.AddNote("Temporary note", 5);

      const event = getEvent();
      expect(event.expiresAfterMessages).toBe(5);
    });

    it("should create event with null expiration for permanent notes", async () => {
      const service = new ChatService(testChatId);

      await service.AddNote("Permanent note", null);

      const event = getEvent();
      expect(event.expiresAfterMessages).toBeNull();
    });

    it("should generate a noteId for the event", async () => {
      const service = new ChatService(testChatId);

      await service.AddNote("Note content", 10);

      const event = getEvent();
      expect(event.noteId).toBeDefined();
      expect(event.noteId).toMatch(/^note-/);
    });

    it("should use correct chatId for ChatEventService", async () => {
      const service = new ChatService(testChatId);

      await service.AddNote("Note content", 10);

      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });
  });

  describe("EditNote", () => {
    it("should emit NoteEdited event", async () => {
      const service = new ChatService(testChatId);

      await service.EditNote("note-123", "Updated content", 20);

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
      const event = mockChatEventService.AddChatEvent.mock.calls[0][0];
      expect(event.type).toBe("NoteEdited");
    });

    it("should create event with correct noteId", async () => {
      const service = new ChatService(testChatId);

      await service.EditNote("note-abc", "Updated", 10);

      const event = getEvent();
      expect(event.noteId).toBe("note-abc");
    });

    it("should create event with updated content", async () => {
      const service = new ChatService(testChatId);

      await service.EditNote("note-123", "New content", 10);

      const event = getEvent();
      expect(event.content).toBe("New content");
    });

    it("should create event with updated expiration", async () => {
      const service = new ChatService(testChatId);

      await service.EditNote("note-123", "Content", 30);

      const event = getEvent();
      expect(event.expiresAfterMessages).toBe(30);
    });

    it("should allow changing expiration to null", async () => {
      const service = new ChatService(testChatId);

      await service.EditNote("note-123", "Content", null);

      const event = getEvent();
      expect(event.expiresAfterMessages).toBeNull();
    });
  });

  // ---- Test Helpers ----

  const getEvent = () =>
    mockChatEventService.AddChatEvent.mock.calls[0][0];
});
