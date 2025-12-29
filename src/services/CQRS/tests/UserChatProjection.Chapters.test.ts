import { describe, it, expect, beforeEach } from "vitest";
import { UserChatProjection } from "../UserChatProjection";
import type {
  MessageCreatedEvent,
  ChapterCreatedEvent,
  ChapterEditedEvent,
  ChapterDeletedEvent,
} from "../events/ChatEvent";

describe("UserChatProjection - Chapter Operations", () => {
  let projection: UserChatProjection;

  beforeEach(() => {
    projection = new UserChatProjection();
  });

  // ---- ChapterCreated Event Tests ----
  describe("ChapterCreated Event Processing", () => {
    it("should add chapter message to Messages array", () => {
      const event: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Chapter One",
        summary: "The beginning",
        coveredMessageIds: [],
      };

      projection.process(event);

      expect(projection.Messages).toHaveLength(1);
      expect(projection.Messages[0].type).toBe("chapter");
      expect(projection.Messages[0].id).toBe("chapter-1");
    });

    it("should set hiddenByChapterId on all covered messages", () => {
      // Add messages first
      ["msg-1", "msg-2", "msg-3"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Create chapter covering msg-1 and msg-2
      const chapterEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Chapter One",
        summary: "Summary",
        coveredMessageIds: ["msg-1", "msg-2"],
      };
      projection.process(chapterEvent);

      expect(projection.Messages[0].hiddenByChapterId).toBe("chapter-1");
      expect(projection.Messages[1].hiddenByChapterId).toBe("chapter-1");
      expect(projection.Messages[2].hiddenByChapterId).toBeUndefined();
    });

    it("should store coveredMessageIds in chapter data", () => {
      const event: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Chapter One",
        summary: "Summary",
        coveredMessageIds: ["msg-1", "msg-2"],
      };

      projection.process(event);

      const chapter = projection.Messages[0];
      expect(chapter.data).toBeDefined();
      expect(chapter.data.coveredMessageIds).toEqual(["msg-1", "msg-2"]);
    });

    it("should set chapter content as summary", () => {
      const event: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Epic Chapter",
        summary: "This is the summary content",
        coveredMessageIds: [],
      };

      projection.process(event);

      expect(projection.Messages[0].content).toBe(
        "This is the summary content"
      );
    });

    it("should initialize chapter with deleted = false", () => {
      const event: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Chapter",
        summary: "Summary",
        coveredMessageIds: [],
      };

      projection.process(event);

      expect(projection.Messages[0].deleted).toBe(false);
    });

    it("should handle empty coveredMessageIds array", () => {
      const event: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Empty Chapter",
        summary: "No messages covered",
        coveredMessageIds: [],
      };

      expect(() => projection.process(event)).not.toThrow();
      expect(projection.Messages[0].data.coveredMessageIds).toEqual([]);
    });

    it("should not affect messages not in coveredMessageIds", () => {
      // Add messages
      ["msg-1", "msg-2", "msg-3", "msg-4"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Create chapter covering only msg-2 and msg-3
      const chapterEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Chapter One",
        summary: "Summary",
        coveredMessageIds: ["msg-2", "msg-3"],
      };
      projection.process(chapterEvent);

      expect(projection.Messages[0].hiddenByChapterId).toBeUndefined();
      expect(projection.Messages[1].hiddenByChapterId).toBe("chapter-1");
      expect(projection.Messages[2].hiddenByChapterId).toBe("chapter-1");
      expect(projection.Messages[3].hiddenByChapterId).toBeUndefined();
    });
  });

  // ---- ChapterEdited Event Tests ----
  describe("ChapterEdited Event Processing", () => {
    it("should update chapter content (summary)", () => {
      // Create chapter
      const createEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Original Title",
        summary: "Original summary",
        coveredMessageIds: [],
      };
      projection.process(createEvent);

      // Edit chapter
      const editEvent: ChapterEditedEvent = {
        type: "ChapterEdited",
        chapterId: "chapter-1",
        title: "New Title",
        summary: "Updated summary",
      };
      projection.process(editEvent);

      expect(projection.Messages[0].content).toBe("Updated summary");
    });

    it("should not edit non-existent chapter", () => {
      const editEvent: ChapterEditedEvent = {
        type: "ChapterEdited",
        chapterId: "non-existent",
        title: "Title",
        summary: "Summary",
      };

      expect(() => projection.process(editEvent)).not.toThrow();
      expect(projection.Messages).toHaveLength(0);
    });

    it("should preserve coveredMessageIds when editing", () => {
      // Create chapter with covered messages
      const createEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Title",
        summary: "Original",
        coveredMessageIds: ["msg-1", "msg-2"],
      };
      projection.process(createEvent);

      // Edit chapter
      const editEvent: ChapterEditedEvent = {
        type: "ChapterEdited",
        chapterId: "chapter-1",
        title: "New Title",
        summary: "New summary",
      };
      projection.process(editEvent);

      expect(projection.Messages[0].data.coveredMessageIds).toEqual([
        "msg-1",
        "msg-2",
      ]);
    });
  });

  // ---- ChapterDeleted Event Tests ----
  describe("ChapterDeleted Event Processing", () => {
    it("should mark chapter as deleted", () => {
      // Create chapter
      const createEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Title",
        summary: "Summary",
        coveredMessageIds: [],
      };
      projection.process(createEvent);

      // Delete chapter
      const deleteEvent: ChapterDeletedEvent = {
        type: "ChapterDeleted",
        chapterId: "chapter-1",
      };
      projection.process(deleteEvent);

      expect(projection.Messages[0].deleted).toBe(true);
    });

    it("should unhide all covered messages (set hiddenByChapterId to undefined)", () => {
      // Add messages
      ["msg-1", "msg-2", "msg-3"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Create chapter
      const createEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Title",
        summary: "Summary",
        coveredMessageIds: ["msg-1", "msg-2"],
      };
      projection.process(createEvent);

      // Verify messages are hidden
      expect(projection.Messages[0].hiddenByChapterId).toBe("chapter-1");
      expect(projection.Messages[1].hiddenByChapterId).toBe("chapter-1");

      // Delete chapter
      const deleteEvent: ChapterDeletedEvent = {
        type: "ChapterDeleted",
        chapterId: "chapter-1",
      };
      projection.process(deleteEvent);

      // Messages should be unhidden
      expect(projection.Messages[0].hiddenByChapterId).toBeUndefined();
      expect(projection.Messages[1].hiddenByChapterId).toBeUndefined();
      expect(projection.Messages[2].hiddenByChapterId).toBeUndefined();
    });

    it("should handle chapter with no coveredMessageIds", () => {
      // Create chapter with no covered messages
      const createEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Empty Chapter",
        summary: "Summary",
        coveredMessageIds: [],
      };
      projection.process(createEvent);

      // Delete chapter
      const deleteEvent: ChapterDeletedEvent = {
        type: "ChapterDeleted",
        chapterId: "chapter-1",
      };

      expect(() => projection.process(deleteEvent)).not.toThrow();
      expect(projection.Messages[0].deleted).toBe(true);
    });

    it("should not throw error for non-existent chapter", () => {
      const deleteEvent: ChapterDeletedEvent = {
        type: "ChapterDeleted",
        chapterId: "non-existent",
      };

      expect(() => projection.process(deleteEvent)).not.toThrow();
    });

    it("should preserve covered message content when unhiding", () => {
      // Add message
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "Important content",
      };
      projection.process(addEvent);

      // Create chapter
      const createEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Title",
        summary: "Summary",
        coveredMessageIds: ["msg-1"],
      };
      projection.process(createEvent);

      // Delete chapter
      const deleteEvent: ChapterDeletedEvent = {
        type: "ChapterDeleted",
        chapterId: "chapter-1",
      };
      projection.process(deleteEvent);

      // Message content should be preserved
      expect(projection.Messages[0].content).toBe("Important content");
      expect(projection.Messages[0].hiddenByChapterId).toBeUndefined();
    });
  });

  // ---- getChapterMessages Tests ----
  describe("getChapterMessages", () => {
    it("should return all messages covered by chapter", () => {
      // Add messages
      ["msg-1", "msg-2", "msg-3"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Create chapter
      const chapterEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Title",
        summary: "Summary",
        coveredMessageIds: ["msg-1", "msg-3"],
      };
      projection.process(chapterEvent);

      const chapterMessages = projection.getChapterMessages("chapter-1");

      expect(chapterMessages).toHaveLength(2);
      expect(chapterMessages[0].id).toBe("msg-1");
      expect(chapterMessages[1].id).toBe("msg-3");
    });

    it("should return empty array if chapter doesn't exist", () => {
      const chapterMessages = projection.getChapterMessages("non-existent");

      expect(chapterMessages).toEqual([]);
    });

    it("should return empty array if chapterId points to non-chapter message", () => {
      // Add regular message
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "Not a chapter",
      };
      projection.process(addEvent);

      const chapterMessages = projection.getChapterMessages("msg-1");

      expect(chapterMessages).toEqual([]);
    });

    it("should return empty array if chapter has no coveredMessageIds", () => {
      // Create chapter with no covered messages
      const chapterEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Empty Chapter",
        summary: "Summary",
        coveredMessageIds: [],
      };
      projection.process(chapterEvent);

      const chapterMessages = projection.getChapterMessages("chapter-1");

      expect(chapterMessages).toEqual([]);
    });

    it("should only return messages in coveredMessageIds list", () => {
      // Add messages
      ["msg-1", "msg-2", "msg-3", "msg-4"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Create chapter covering only msg-2 and msg-4
      const chapterEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Title",
        summary: "Summary",
        coveredMessageIds: ["msg-2", "msg-4"],
      };
      projection.process(chapterEvent);

      const chapterMessages = projection.getChapterMessages("chapter-1");

      expect(chapterMessages).toHaveLength(2);
      expect(chapterMessages.map((m) => m.id)).toEqual(["msg-2", "msg-4"]);
    });

    it("should include deleted messages in covered messages (not filtered)", () => {
      // Add messages
      ["msg-1", "msg-2"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Create chapter
      const chapterEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Title",
        summary: "Summary",
        coveredMessageIds: ["msg-1", "msg-2"],
      };
      projection.process(chapterEvent);

      // Delete one message
      projection.Messages[0].deleted = true;

      const chapterMessages = projection.getChapterMessages("chapter-1");

      // Should still include deleted message
      expect(chapterMessages).toHaveLength(2);
      expect(chapterMessages[0].deleted).toBe(true);
    });
  });

  // ---- Complex Chapter Scenarios ----
  describe("Complex Chapter Scenarios", () => {
    it("should handle message hidden by chapter, then chapter deleted (message visible again)", () => {
      // Add message
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };
      projection.process(addEvent);

      // Create chapter hiding message
      const createEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Title",
        summary: "Summary",
        coveredMessageIds: ["msg-1"],
      };
      projection.process(createEvent);

      // Message should be hidden
      let visibleMessages = projection.GetMessages();
      expect(visibleMessages).toHaveLength(1); // Only chapter visible
      expect(visibleMessages[0].type).toBe("chapter");

      // Delete chapter
      const deleteEvent: ChapterDeletedEvent = {
        type: "ChapterDeleted",
        chapterId: "chapter-1",
      };
      projection.process(deleteEvent);

      // Message should be visible again
      visibleMessages = projection.GetMessages();
      expect(visibleMessages).toHaveLength(1);
      expect(visibleMessages[0].id).toBe("msg-1");
      expect(visibleMessages[0].type).toBe("user-message");
    });

    it("should handle multiple chapters covering different messages", () => {
      // Add messages
      ["msg-1", "msg-2", "msg-3", "msg-4"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Create first chapter
      const chapter1: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Chapter 1",
        summary: "Summary 1",
        coveredMessageIds: ["msg-1", "msg-2"],
      };
      projection.process(chapter1);

      // Create second chapter
      const chapter2: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-2",
        title: "Chapter 2",
        summary: "Summary 2",
        coveredMessageIds: ["msg-3", "msg-4"],
      };
      projection.process(chapter2);

      // Check hidden states
      expect(projection.Messages[0].hiddenByChapterId).toBe("chapter-1");
      expect(projection.Messages[1].hiddenByChapterId).toBe("chapter-1");
      expect(projection.Messages[2].hiddenByChapterId).toBe("chapter-2");
      expect(projection.Messages[3].hiddenByChapterId).toBe("chapter-2");

      // Only chapters should be visible
      const visibleMessages = projection.GetMessages();
      expect(visibleMessages).toHaveLength(2);
      expect(visibleMessages.every((m) => m.type === "chapter")).toBe(true);
    });

    it("should handle chapter creation → edit → delete workflow", () => {
      // Add messages
      ["msg-1", "msg-2"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Create chapter
      const createEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "chapter-1",
        title: "Original",
        summary: "Original summary",
        coveredMessageIds: ["msg-1", "msg-2"],
      };
      projection.process(createEvent);

      // Edit chapter
      const editEvent: ChapterEditedEvent = {
        type: "ChapterEdited",
        chapterId: "chapter-1",
        title: "Updated",
        summary: "Updated summary",
      };
      projection.process(editEvent);

      // Verify edit
      const chapter = projection.Messages.find((m) => m.id === "chapter-1");
      expect(chapter?.content).toBe("Updated summary");

      // Delete chapter
      const deleteEvent: ChapterDeletedEvent = {
        type: "ChapterDeleted",
        chapterId: "chapter-1",
      };
      projection.process(deleteEvent);

      // Verify messages unhidden
      expect(projection.Messages[0].hiddenByChapterId).toBeUndefined();
      expect(projection.Messages[1].hiddenByChapterId).toBeUndefined();
    });
  });
});
