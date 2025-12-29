import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ChatService } from "../ChatService";
import { d } from "../../Dependencies";

vi.mock("../../Dependencies");

describe("ChatService - Story Operations", () => {
  let mockChatEventService: any;
  const testChatId = "test-chat-456";

  beforeEach(() => {
    mockChatEventService = {
      AddChatEvent: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.ChatEventService).mockReturnValue(mockChatEventService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("InitializeStory", () => {
    it("should create StoryCreated event with content", async () => {
      const service = new ChatService(testChatId);
      const storyContent = "In a land far, far away...";

      await service.InitializeStory(storyContent);

      const calledEvent = getFirstCalledEvent();
      expect(calledEvent.type).toBe("StoryCreated");
      expect(calledEvent.content).toBe(storyContent);
    });

    it("should generate unique storyId", async () => {
      const service = new ChatService(testChatId);

      await service.InitializeStory("Story content");

      const calledEvent = getFirstCalledEvent();
      expect(calledEvent.storyId).toBeDefined();
      expect(calledEvent.storyId).toMatch(/^story-/);
    });

    it("should call ChatEventService with StoryCreated event", async () => {
      const service = new ChatService(testChatId);
      const content = "Once upon a time";

      await service.InitializeStory(content);

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "StoryCreated",
          content,
        })
      );
    });

    it("should use correct chatId", async () => {
      const service = new ChatService(testChatId);

      await service.InitializeStory("Story");

      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });
  });

  describe("EditStory", () => {
    it("should create StoryEdited event with storyId and content", async () => {
      const service = new ChatService(testChatId);
      const storyId = "story-123";
      const newContent = "Updated story content";

      await service.EditStory(storyId, newContent);

      const calledEvent = getFirstCalledEvent();
      expect(calledEvent.type).toBe("StoryEdited");
      expect(calledEvent.storyId).toBe(storyId);
      expect(calledEvent.content).toBe(newContent);
    });

    it("should call ChatEventService with StoryEdited event", async () => {
      const service = new ChatService(testChatId);
      const storyId = "story-456";
      const content = "Revised story";

      await service.EditStory(storyId, content);

      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledTimes(1);
      expect(mockChatEventService.AddChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "StoryEdited",
          storyId,
          content,
        })
      );
    });

    it("should use correct chatId", async () => {
      const service = new ChatService(testChatId);

      await service.EditStory("story-789", "Content");

      expect(d.ChatEventService).toHaveBeenCalledWith(testChatId);
    });
  });

  function getFirstCalledEvent() {
    return mockChatEventService.AddChatEvent.mock.calls[0][0];
  }
});
