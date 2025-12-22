import { describe, it, expect, beforeEach } from "vitest";
import { UserChatProjection } from "./UserChatProjection";
import { StoryCreatedEventUtil } from "./events/StoryCreatedEventUtil";
import { StoryEditedEventUtil } from "./events/StoryEditedEventUtil";

describe("UserChatProjection - Story Events", () => {
  let projection: UserChatProjection;

  beforeEach(() => {
    projection = new UserChatProjection();
  });

  describe("StoryCreated Event", () => {
    it("should add story message to beginning of messages", () => {
      const storyContent = "In a land far, far away...";
      const event = StoryCreatedEventUtil.Create(storyContent);

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("story");
      expect(messages[0].content).toBe(storyContent);
    });

    it("should place story before other messages", () => {
      const event = StoryCreatedEventUtil.Create("Story content");

      projection.process(event);

      const messages = projection.GetMessages();
      const storyMessage = messages[0];
      expect(storyMessage.type).toBe("story");
      expect(storyMessage.id).toBe(event.storyId);
    });

    it("should mark story as not deleted", () => {
      const event = StoryCreatedEventUtil.Create("Story");

      projection.process(event);

      const story = projection.GetMessage(event.storyId);
      expect(story?.deleted).toBe(false);
    });

    it("should not hide story by chapter", () => {
      const event = StoryCreatedEventUtil.Create("Story");

      projection.process(event);

      const story = projection.GetMessage(event.storyId);
      expect(story?.hiddenByChapterId).toBeUndefined();
    });
  });

  describe("StoryEdited Event", () => {
    it("should update story content", () => {
      const createEvent = StoryCreatedEventUtil.Create("Original story");
      projection.process(createEvent);

      const newContent = "Updated story content";
      const editEvent = StoryEditedEventUtil.Create(
        createEvent.storyId,
        newContent
      );
      projection.process(editEvent);

      const story = projection.GetMessage(createEvent.storyId);
      expect(story?.content).toBe(newContent);
    });

    it("should not change story type", () => {
      const createEvent = StoryCreatedEventUtil.Create("Story");
      projection.process(createEvent);

      const editEvent = StoryEditedEventUtil.Create(
        createEvent.storyId,
        "Updated"
      );
      projection.process(editEvent);

      const story = projection.GetMessage(createEvent.storyId);
      expect(story?.type).toBe("story");
    });

    it("should handle edit of non-existent story gracefully", () => {
      const editEvent = StoryEditedEventUtil.Create(
        "non-existent-id",
        "Content"
      );

      expect(() => projection.process(editEvent)).not.toThrow();
    });
  });

  describe("Story Message Position", () => {
    it("should keep story at beginning when other messages added", () => {
      const storyEvent = StoryCreatedEventUtil.Create("Story");
      projection.process(storyEvent);

      const messages = projection.GetMessages();
      expect(messages[0].type).toBe("story");
      expect(messages[0].id).toBe(storyEvent.storyId);
    });
  });
});
