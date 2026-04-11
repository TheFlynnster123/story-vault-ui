import { describe, it, expect, beforeEach } from "vitest";
import { UserChatProjection } from "../UserChatProjection";
import type {
  MessageCreatedEvent,
  ChapterCreatedEvent,
  BookCreatedEvent,
  BookEditedEvent,
  BookDeletedEvent,
} from "../events/ChatEvent";

describe("UserChatProjection - Book Operations", () => {
  let projection: UserChatProjection;

  beforeEach(() => {
    projection = new UserChatProjection();
  });

  // ---- Helper Functions ----
  function addMessages(ids: string[]) {
    ids.forEach((id) => {
      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: id,
        role: "user",
        content: `Content ${id}`,
      };
      projection.process(event);
    });
  }

  function addChapter(
    chapterId: string,
    title: string,
    summary: string,
    coveredMessageIds: string[],
  ) {
    const event: ChapterCreatedEvent = {
      type: "ChapterCreated",
      chapterId,
      title,
      summary,
      coveredMessageIds,
    };
    projection.process(event);
  }

  function addBook(
    bookId: string,
    title: string,
    summary: string,
    coveredChapterIds: string[],
  ) {
    const event: BookCreatedEvent = {
      type: "BookCreated",
      bookId,
      title,
      summary,
      coveredChapterIds,
    };
    projection.process(event);
  }

  // ---- BookCreated Event Tests ----
  describe("BookCreated Event Processing", () => {
    it("should add book message to Messages array", () => {
      addBook("book-1", "Book One", "Book summary", []);

      expect(projection.Messages).toHaveLength(1);
      expect(projection.Messages[0].type).toBe("book");
      expect(projection.Messages[0].id).toBe("book-1");
    });

    it("should set book content as summary", () => {
      addBook("book-1", "Book One", "This is the book summary", []);

      expect(projection.Messages[0].content).toBe("This is the book summary");
    });

    it("should store coveredChapterIds in book data", () => {
      addBook("book-1", "Book One", "Summary", ["ch-1", "ch-2"]);

      expect(projection.Messages[0].data).toBeDefined();
      expect(projection.Messages[0].data.coveredChapterIds).toEqual([
        "ch-1",
        "ch-2",
      ]);
    });

    it("should store title in book data", () => {
      addBook("book-1", "Epic Book", "Summary", []);

      expect(projection.Messages[0].data.title).toBe("Epic Book");
    });

    it("should set hiddenByBookId on covered chapters", () => {
      addMessages(["msg-1", "msg-2", "msg-3", "msg-4"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);

      addBook("book-1", "Book One", "Book summary", ["ch-1", "ch-2"]);

      const ch1 = projection.Messages.find((m) => m.id === "ch-1");
      const ch2 = projection.Messages.find((m) => m.id === "ch-2");
      expect(ch1?.hiddenByBookId).toBe("book-1");
      expect(ch2?.hiddenByBookId).toBe("book-1");
    });

    it("should not set hiddenByBookId on non-covered chapters", () => {
      addMessages(["msg-1", "msg-2", "msg-3", "msg-4"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);

      addBook("book-1", "Book One", "Book summary", ["ch-1"]);

      const ch2 = projection.Messages.find((m) => m.id === "ch-2");
      expect(ch2?.hiddenByBookId).toBeUndefined();
    });

    it("should initialize book with deleted = false", () => {
      addBook("book-1", "Book", "Summary", []);

      expect(projection.Messages[0].deleted).toBe(false);
    });

    it("should handle empty coveredChapterIds array", () => {
      expect(() =>
        addBook("book-1", "Empty Book", "No chapters covered", []),
      ).not.toThrow();
      expect(projection.Messages[0].data.coveredChapterIds).toEqual([]);
    });
  });

  // ---- BookEdited Event Tests ----
  describe("BookEdited Event Processing", () => {
    it("should update book content (summary)", () => {
      addBook("book-1", "Original Title", "Original summary", []);

      const editEvent: BookEditedEvent = {
        type: "BookEdited",
        bookId: "book-1",
        title: "New Title",
        summary: "Updated summary",
      };
      projection.process(editEvent);

      expect(projection.Messages[0].content).toBe("Updated summary");
    });

    it("should update book title in data", () => {
      addBook("book-1", "Original Title", "Summary", []);

      const editEvent: BookEditedEvent = {
        type: "BookEdited",
        bookId: "book-1",
        title: "New Title",
        summary: "Summary",
      };
      projection.process(editEvent);

      expect(projection.Messages[0].data.title).toBe("New Title");
    });

    it("should preserve coveredChapterIds when editing", () => {
      addBook("book-1", "Title", "Summary", ["ch-1", "ch-2"]);

      const editEvent: BookEditedEvent = {
        type: "BookEdited",
        bookId: "book-1",
        title: "New Title",
        summary: "New summary",
      };
      projection.process(editEvent);

      expect(projection.Messages[0].data.coveredChapterIds).toEqual([
        "ch-1",
        "ch-2",
      ]);
    });

    it("should not edit non-existent book", () => {
      const editEvent: BookEditedEvent = {
        type: "BookEdited",
        bookId: "non-existent",
        title: "Title",
        summary: "Summary",
      };

      expect(() => projection.process(editEvent)).not.toThrow();
      expect(projection.Messages).toHaveLength(0);
    });
  });

  // ---- BookDeleted Event Tests ----
  describe("BookDeleted Event Processing", () => {
    it("should mark book as deleted", () => {
      addBook("book-1", "Title", "Summary", []);

      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "book-1",
      };
      projection.process(deleteEvent);

      expect(projection.Messages[0].deleted).toBe(true);
    });

    it("should unhide all covered chapters (set hiddenByBookId to undefined)", () => {
      addMessages(["msg-1", "msg-2", "msg-3", "msg-4"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);
      addBook("book-1", "Book One", "Summary", ["ch-1", "ch-2"]);

      // Verify chapters are hidden
      expect(
        projection.Messages.find((m) => m.id === "ch-1")?.hiddenByBookId,
      ).toBe("book-1");
      expect(
        projection.Messages.find((m) => m.id === "ch-2")?.hiddenByBookId,
      ).toBe("book-1");

      // Delete book
      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "book-1",
      };
      projection.process(deleteEvent);

      // Chapters should be unhidden
      expect(
        projection.Messages.find((m) => m.id === "ch-1")?.hiddenByBookId,
      ).toBeUndefined();
      expect(
        projection.Messages.find((m) => m.id === "ch-2")?.hiddenByBookId,
      ).toBeUndefined();
    });

    it("should not throw error for non-existent book", () => {
      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "non-existent",
      };

      expect(() => projection.process(deleteEvent)).not.toThrow();
    });

    it("should handle book with no coveredChapterIds", () => {
      addBook("book-1", "Empty Book", "Summary", []);

      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "book-1",
      };

      expect(() => projection.process(deleteEvent)).not.toThrow();
      expect(projection.Messages[0].deleted).toBe(true);
    });
  });

  // ---- getBookChapters Tests ----
  describe("getBookChapters", () => {
    it("should return all chapters covered by book", () => {
      addMessages(["msg-1", "msg-2", "msg-3", "msg-4"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);
      addBook("book-1", "Book One", "Summary", ["ch-1", "ch-2"]);

      const bookChapters = projection.getBookChapters("book-1");

      expect(bookChapters).toHaveLength(2);
      expect(bookChapters[0].id).toBe("ch-1");
      expect(bookChapters[1].id).toBe("ch-2");
    });

    it("should return empty array if book doesn't exist", () => {
      const bookChapters = projection.getBookChapters("non-existent");
      expect(bookChapters).toEqual([]);
    });

    it("should return empty array if bookId points to non-book message", () => {
      addMessages(["msg-1"]);
      const bookChapters = projection.getBookChapters("msg-1");
      expect(bookChapters).toEqual([]);
    });

    it("should return empty array if book has no coveredChapterIds", () => {
      addBook("book-1", "Empty Book", "Summary", []);

      const bookChapters = projection.getBookChapters("book-1");
      expect(bookChapters).toEqual([]);
    });
  });

  // ---- GetMessages Visibility Tests ----
  describe("GetMessages visibility with books", () => {
    it("should hide chapters covered by a book in GetMessages()", () => {
      addMessages(["msg-1", "msg-2", "msg-3", "msg-4"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);
      addBook("book-1", "Book One", "Book summary", ["ch-1", "ch-2"]);

      const visibleMessages = projection.GetMessages();

      // Only the book should be visible (chapters hidden by book, messages hidden by chapters)
      expect(visibleMessages).toHaveLength(1);
      expect(visibleMessages[0].type).toBe("book");
      expect(visibleMessages[0].id).toBe("book-1");
    });

    it("should restore chapter visibility after book deletion", () => {
      addMessages(["msg-1", "msg-2", "msg-3", "msg-4"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);
      addBook("book-1", "Book One", "Book summary", ["ch-1", "ch-2"]);

      // Delete book
      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "book-1",
      };
      projection.process(deleteEvent);

      const visibleMessages = projection.GetMessages();

      // Chapters should be visible again
      const chapterMessages = visibleMessages.filter(
        (m) => m.type === "chapter",
      );
      expect(chapterMessages).toHaveLength(2);
    });
  });

  // ---- Book Chronological Insertion Tests ----
  describe("Book Chronological Insertion", () => {
    it("should insert book at the position of its first covered chapter", () => {
      addMessages(["msg-1", "msg-2", "msg-3", "msg-4"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);

      addBook("book-1", "Book One", "Book summary", ["ch-1", "ch-2"]);

      // Book should be at the position of ch-1 (index 4, after the 4 messages)
      const bookIndex = projection.Messages.findIndex(
        (m) => m.id === "book-1",
      );
      const ch1Index = projection.Messages.findIndex(
        (m) => m.id === "ch-1",
      );

      expect(bookIndex).toBeLessThanOrEqual(ch1Index);
    });

    it("should place book before any messages that come after the chapters", () => {
      addMessages(["msg-1", "msg-2"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addMessages(["msg-3", "msg-4"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);
      addMessages(["msg-5"]); // message after chapters

      addBook("book-1", "Book One", "Book summary", ["ch-1", "ch-2"]);

      const bookIndex = projection.Messages.findIndex(
        (m) => m.id === "book-1",
      );
      const msg5Index = projection.Messages.findIndex(
        (m) => m.id === "msg-5",
      );

      expect(bookIndex).toBeLessThan(msg5Index);
    });

    it("should preserve chronological order in GetMessages when book covers early chapters", () => {
      addMessages(["msg-1", "msg-2"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addMessages(["msg-3", "msg-4"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);
      addMessages(["msg-5", "msg-6"]);
      addChapter("ch-3", "Chapter 3", "Summary 3", ["msg-5", "msg-6"]);

      // Compress ch-1 and ch-2 into a book
      addBook("book-1", "Book One", "Book summary", ["ch-1", "ch-2"]);

      const visibleMessages = projection.GetMessages();

      // Expected order: book-1, ch-3
      expect(visibleMessages).toHaveLength(2);
      expect(visibleMessages[0].id).toBe("book-1");
      expect(visibleMessages[0].type).toBe("book");
      expect(visibleMessages[1].id).toBe("ch-3");
      expect(visibleMessages[1].type).toBe("chapter");
    });

    it("should maintain correct order with multiple books", () => {
      addMessages(["msg-1", "msg-2"]);
      addChapter("ch-1", "Chapter 1", "S1", ["msg-1"]);
      addChapter("ch-2", "Chapter 2", "S2", ["msg-2"]);
      addMessages(["msg-3", "msg-4"]);
      addChapter("ch-3", "Chapter 3", "S3", ["msg-3"]);
      addChapter("ch-4", "Chapter 4", "S4", ["msg-4"]);

      addBook("book-1", "Book 1", "BS1", ["ch-1", "ch-2"]);
      addBook("book-2", "Book 2", "BS2", ["ch-3", "ch-4"]);

      const visibleMessages = projection.GetMessages();

      expect(visibleMessages).toHaveLength(2);
      expect(visibleMessages[0].id).toBe("book-1");
      expect(visibleMessages[1].id).toBe("book-2");
    });

    it("should insert book at end when no covered chapters found", () => {
      addMessages(["msg-1"]);
      addBook("book-1", "Empty Book", "Summary", []);

      // Book should be at the end
      const lastMessage = projection.Messages[projection.Messages.length - 1];
      expect(lastMessage.id).toBe("book-1");
    });

    it("should place book before later uncovered chapters and messages", () => {
      addMessages(["msg-1", "msg-2"]);
      addChapter("ch-1", "Chapter 1", "S1", ["msg-1", "msg-2"]);
      addMessages(["msg-3", "msg-4"]);
      addChapter("ch-2", "Chapter 2", "S2", ["msg-3", "msg-4"]);
      addMessages(["msg-5", "msg-6"]);

      // Only compress ch-1, leave ch-2 uncovered
      addBook("book-1", "Book One", "Book summary", ["ch-1"]);

      const visibleMessages = projection.GetMessages();

      // Expected: book-1, ch-2, msg-5, msg-6
      expect(visibleMessages).toHaveLength(4);
      expect(visibleMessages[0].id).toBe("book-1");
      expect(visibleMessages[1].id).toBe("ch-2");
      expect(visibleMessages[2].id).toBe("msg-5");
      expect(visibleMessages[3].id).toBe("msg-6");
    });

    it("should insert book at correct position in the internal Messages array", () => {
      addMessages(["msg-1", "msg-2"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addMessages(["msg-3", "msg-4"]);
      addChapter("ch-2", "Chapter 2", "Summary 2", ["msg-3", "msg-4"]);

      // Before book: [msg-1, msg-2, ch-1, msg-3, msg-4, ch-2]
      // ch-1 is at index 2
      addBook("book-1", "Book One", "Book summary", ["ch-1", "ch-2"]);

      // After book: [msg-1, msg-2, book-1, ch-1, msg-3, msg-4, ch-2]
      // Book should be inserted at the position of first chapter (ch-1)
      const bookIndex = projection.Messages.findIndex(
        (m) => m.id === "book-1",
      );
      const ch1Index = projection.Messages.findIndex(
        (m) => m.id === "ch-1",
      );

      // Book should be right before ch-1
      expect(bookIndex).toBe(ch1Index - 1);
    });
  });

  // ---- Complex Book Scenarios ----
  describe("Complex Book Scenarios", () => {
    it("should handle book creation → edit → delete workflow", () => {
      addMessages(["msg-1", "msg-2"]);
      addChapter("ch-1", "Chapter 1", "Summary 1", ["msg-1", "msg-2"]);
      addBook("book-1", "Original Book", "Original summary", ["ch-1"]);

      // Edit book
      const editEvent: BookEditedEvent = {
        type: "BookEdited",
        bookId: "book-1",
        title: "Updated Book",
        summary: "Updated summary",
      };
      projection.process(editEvent);

      // Verify edit
      const book = projection.Messages.find((m) => m.id === "book-1");
      expect(book?.content).toBe("Updated summary");
      expect(book?.data.title).toBe("Updated Book");

      // Delete book
      const deleteEvent: BookDeletedEvent = {
        type: "BookDeleted",
        bookId: "book-1",
      };
      projection.process(deleteEvent);

      // Verify chapter unhidden
      const ch1 = projection.Messages.find((m) => m.id === "ch-1");
      expect(ch1?.hiddenByBookId).toBeUndefined();
    });

    it("should handle multiple books covering different chapters", () => {
      addMessages(["msg-1", "msg-2", "msg-3", "msg-4"]);
      addChapter("ch-1", "Chapter 1", "S1", ["msg-1"]);
      addChapter("ch-2", "Chapter 2", "S2", ["msg-2"]);
      addChapter("ch-3", "Chapter 3", "S3", ["msg-3"]);
      addChapter("ch-4", "Chapter 4", "S4", ["msg-4"]);

      addBook("book-1", "Book 1", "BS1", ["ch-1", "ch-2"]);
      addBook("book-2", "Book 2", "BS2", ["ch-3", "ch-4"]);

      expect(
        projection.Messages.find((m) => m.id === "ch-1")?.hiddenByBookId,
      ).toBe("book-1");
      expect(
        projection.Messages.find((m) => m.id === "ch-2")?.hiddenByBookId,
      ).toBe("book-1");
      expect(
        projection.Messages.find((m) => m.id === "ch-3")?.hiddenByBookId,
      ).toBe("book-2");
      expect(
        projection.Messages.find((m) => m.id === "ch-4")?.hiddenByBookId,
      ).toBe("book-2");

      const visibleMessages = projection.GetMessages();
      expect(visibleMessages).toHaveLength(2);
      expect(visibleMessages.every((m) => m.type === "book")).toBe(true);
    });
  });
});
