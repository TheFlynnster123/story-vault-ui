import { describe, it, expect, beforeEach } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import { StoryCreatedEventUtil } from "../events/StoryCreatedEventUtil";
import { StoryEditedEventUtil } from "../events/StoryEditedEventUtil";

describe("LLMChatProjection - Story Events", () => {
  let projection: LLMChatProjection;

  beforeEach(() => {
    projection = new LLMChatProjection();
  });

  describe("StoryCreated Event", () => {
    it("should add story message with Story prefix", () => {
      const storyContent = "In a land far, far away...";
      const event = StoryCreatedEventUtil.Create(storyContent);

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toBe(`# Story\r\n${storyContent}`);
    });

    it("should place story at beginning of messages", () => {
      const event = StoryCreatedEventUtil.Create("Story content");

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages[0].content).toContain("# Story");
    });

    it("should format story content correctly", () => {
      const content = "Once upon a time in the kingdom";
      const event = StoryCreatedEventUtil.Create(content);

      projection.process(event);

      const story = projection.GetMessage(event.storyId);
      expect(story?.content).toBe(`# Story\r\n${content}`);
    });
  });

  describe("StoryEdited Event", () => {
    it("should update story content with Story prefix", () => {
      const createEvent = StoryCreatedEventUtil.Create("Original story");
      projection.process(createEvent);

      const newContent = "Updated story content";
      const editEvent = StoryEditedEventUtil.Create(
        createEvent.storyId,
        newContent
      );
      projection.process(editEvent);

      const story = projection.GetMessage(createEvent.storyId);
      expect(story?.content).toBe(`# Story\r\n${newContent}`);
    });

    it("should maintain system role after edit", () => {
      const createEvent = StoryCreatedEventUtil.Create("Story");
      projection.process(createEvent);

      const editEvent = StoryEditedEventUtil.Create(
        createEvent.storyId,
        "Updated"
      );
      projection.process(editEvent);

      const story = projection.GetMessage(createEvent.storyId);
      expect(story?.role).toBe("system");
    });

    it("should handle edit of non-existent story gracefully", () => {
      const editEvent = StoryEditedEventUtil.Create(
        "non-existent-id",
        "Content"
      );

      expect(() => projection.process(editEvent)).not.toThrow();
    });

    it("should not update deleted story", () => {
      const createEvent = StoryCreatedEventUtil.Create("Original");
      projection.process(createEvent);

      const editEvent = StoryEditedEventUtil.Create(createEvent.storyId, "New");
      projection.process(editEvent);

      const messages = projection.GetMessages();
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe("Story in LLM Context", () => {
    it("should include story in GetMessages output", () => {
      const event = StoryCreatedEventUtil.Create("Story for LLM");

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].content).toContain("Story for LLM");
    });

    it("should always place story first in context", () => {
      const storyEvent = StoryCreatedEventUtil.Create("Story");
      projection.process(storyEvent);

      const messages = projection.GetMessages();
      expect(messages[0].content).toContain("# Story");
    });
  });
});
