import { describe, it, expect, beforeEach } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import type {
  MessageCreatedEvent,
  ChapterCreatedEvent,
  BookCreatedEvent,
  BookEditedEvent,
  BookDeletedEvent,
} from "../events/ChatEvent";

describe("LLMChatProjection - Book Operations", () => {
  let projection: LLMChatProjection;

  beforeEach(() => {
    projection = new LLMChatProjection();
  });

  // ---- Helper Functions ----
  function createMessage(
    proj: LLMChatProjection,
    id: string,
    role: "user" | "assistant" | "system",
    content: string,
  ): void {
    const event: MessageCreatedEvent = {
      type: "MessageCreated",
      messageId: id,
      role,
      content,
    };
    proj.process(event);
  }

  function createChapter(
    proj: LLMChatProjection,
    chapterId: string,
    title: string,
    summary: string,
    coveredMessageIds: string[],
  ): void {
    const event: ChapterCreatedEvent = {
      type: "ChapterCreated",
      chapterId,
      title,
      summary,
      coveredMessageIds,
    };
    proj.process(event);
  }

  function createBook(
    proj: LLMChatProjection,
    bookId: string,
    title: string,
    summary: string,
    coveredChapterIds: string[],
  ): void {
    const event: BookCreatedEvent = {
      type: "BookCreated",
      bookId,
      title,
      summary,
      coveredChapterIds,
    };
    proj.process(event);
  }

  // ---- BookCreated Event Tests ----
  describe("BookCreated Event Processing", () => {
    it("should add book message with formatted content", () => {
      createBook(projection, "book-1", "Book One", "Book summary", []);

      const messages = projection.GetMessages();
      const bookMessage = messages.find((m) => m.id === "book-1");

      expect(bookMessage).toBeDefined();
      expect(bookMessage!.content).toBe(
        "[Book Summary: Book One]\nBook summary\n[End of Book Summary]",
      );
      expect(bookMessage!.role).toBe("system");
    });

    it("should hide covered chapters", () => {
      createMessage(projection, "msg-1", "user", "Hello");
      createMessage(projection, "msg-2", "assistant", "World");
      createChapter(projection, "ch-1", "Chapter 1", "Summary 1", [
        "msg-1",
        "msg-2",
      ]);

      createMessage(projection, "msg-3", "user", "More");
      createMessage(projection, "msg-4", "assistant", "Content");
      createChapter(projection, "ch-2", "Chapter 2", "Summary 2", [
        "msg-3",
        "msg-4",
      ]);

      createBook(projection, "book-1", "Book One", "Book summary", [
        "ch-1",
        "ch-2",
      ]);

      const messages = projection.GetMessages();

      // Chapters should be hidden, book should be visible
      const chapterMessages = messages.filter((m) =>
        m.content?.includes("[Previous Chapter Summary:"),
      );
      expect(chapterMessages).toHaveLength(0);

      const bookMessages = messages.filter((m) =>
        m.content?.includes("[Book Summary:"),
      );
      expect(bookMessages).toHaveLength(1);
    });

    it("should not hide non-covered chapters", () => {
      createMessage(projection, "msg-1", "user", "Hello");
      createChapter(projection, "ch-1", "Chapter 1", "Summary 1", ["msg-1"]);

      createMessage(projection, "msg-2", "user", "More");
      createChapter(projection, "ch-2", "Chapter 2", "Summary 2", ["msg-2"]);

      // Only cover ch-1
      createBook(projection, "book-1", "Book One", "Book summary", ["ch-1"]);

      const messages = projection.GetMessages();

      // ch-2 should still be visible
      const chapterMessages = messages.filter((m) =>
        m.content?.includes("[Previous Chapter Summary: Chapter 2]"),
      );
      expect(chapterMessages).toHaveLength(1);
    });
  });

  // ---- BookEdited Event Tests ----
  describe("BookEdited Event Processing", () => {
    it("should update book content with new formatted text", () => {
      createBook(projection, "book-1", "Original Title", "Original summary", []);

      const editEvent: BookEditedEvent = {
        type: "BookEdited",
        bookId: "book-1",
        title: "New Title",
        summary: "Updated summary",
      };
      projection.process(editEvent);

      const messages = projection.GetMessages();
      const bookMessage = messages.find((m) => m.id === "book-1");

      expect(bookMessage!.content).toBe(
        "[Book Summary: New Title]\nUpdated summary\n[End of Book Summary]",
      );
    });

    it("should not throw for non-existent book", () => {
      const editEvent: BookEditedEvent = {
        type: "BookEdited",
        bookId: "non-existent",
        title: "Title",
        summary: "Summary",
      };

      expect(() => projection.process(editEvent)).not.toThrow();
    });
  });

  // ---- BookDeleted Event Tests ----
  describe("BookDeleted Event Processing", () => {
    it("should mark book as deleted", () => {
      createBook(projection, "book-1", "Book One", "Summary", []);

      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "book-1",
      };
      projection.process(deleteEvent);

      const messages = projection.GetMessages();
      const bookMessage = messages.find((m) => m.id === "book-1");
      expect(bookMessage).toBeUndefined();
    });

    it("should unhide covered chapters", () => {
      createMessage(projection, "msg-1", "user", "Hello");
      createChapter(projection, "ch-1", "Chapter 1", "Summary 1", ["msg-1"]);

      createMessage(projection, "msg-2", "user", "More");
      createChapter(projection, "ch-2", "Chapter 2", "Summary 2", ["msg-2"]);

      createBook(projection, "book-1", "Book One", "Book summary", [
        "ch-1",
        "ch-2",
      ]);

      // Delete book
      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "book-1",
      };
      projection.process(deleteEvent);

      const messages = projection.GetMessages();

      // Chapters should be visible again
      const chapterMessages = messages.filter((m) =>
        m.content?.includes("[Previous Chapter Summary:"),
      );
      expect(chapterMessages).toHaveLength(2);
    });

    it("should not throw for non-existent book", () => {
      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "non-existent",
      };

      expect(() => projection.process(deleteEvent)).not.toThrow();
    });
  });

  // ---- Format Tests ----
  describe("formatBookContent", () => {
    it("should format book content with title and summary", () => {
      const result = projection.formatBookContent("My Book", "Great story");
      expect(result).toBe(
        "[Book Summary: My Book]\nGreat story\n[End of Book Summary]",
      );
    });
  });

  // ---- Complex Scenarios ----
  describe("Complex Book Scenarios", () => {
    it("should handle book creation → edit → delete workflow", () => {
      createMessage(projection, "msg-1", "user", "Hello");
      createChapter(projection, "ch-1", "Chapter 1", "Summary 1", ["msg-1"]);

      createBook(projection, "book-1", "Original Book", "Original summary", [
        "ch-1",
      ]);

      // Edit
      const editEvent: BookEditedEvent = {
        type: "BookEdited",
        bookId: "book-1",
        title: "Updated Book",
        summary: "Updated summary",
      };
      projection.process(editEvent);

      let messages = projection.GetMessages();
      const bookMsg = messages.find((m) => m.id === "book-1");
      expect(bookMsg!.content).toContain("Updated Book");

      // Delete
      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "book-1",
      };
      projection.process(deleteEvent);

      messages = projection.GetMessages();
      const chapterMessages = messages.filter((m) =>
        m.content?.includes("[Previous Chapter Summary:"),
      );
      expect(chapterMessages).toHaveLength(1);
    });

    it("should handle multiple books covering different chapter groups", () => {
      createMessage(projection, "msg-1", "user", "Hello");
      createChapter(projection, "ch-1", "Chapter 1", "S1", ["msg-1"]);

      createMessage(projection, "msg-2", "user", "More");
      createChapter(projection, "ch-2", "Chapter 2", "S2", ["msg-2"]);

      createMessage(projection, "msg-3", "user", "Even more");
      createChapter(projection, "ch-3", "Chapter 3", "S3", ["msg-3"]);

      createMessage(projection, "msg-4", "user", "Final");
      createChapter(projection, "ch-4", "Chapter 4", "S4", ["msg-4"]);

      createBook(projection, "book-1", "Book 1", "BS1", ["ch-1", "ch-2"]);
      createBook(projection, "book-2", "Book 2", "BS2", ["ch-3", "ch-4"]);

      const messages = projection.GetMessages();

      // Both books visible, no chapters visible
      const bookMessages = messages.filter((m) =>
        m.content?.includes("[Book Summary:"),
      );
      expect(bookMessages).toHaveLength(2);

      const chapterMessages = messages.filter((m) =>
        m.content?.includes("[Previous Chapter Summary:"),
      );
      expect(chapterMessages).toHaveLength(0);
    });
  });
});
