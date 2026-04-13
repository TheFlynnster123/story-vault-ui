import { describe, it, expect, beforeEach } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import {
  NoteCreatedEventUtil,
  NoteEditedEventUtil,
} from "../events/NoteEventUtils";
import { MessageCreatedEventUtil } from "../events/MessageCreatedEventUtil";
import type { ChapterCreatedEvent } from "../events/ChatEvent";

const createChapterEvent = (
  chapterId: string,
  coveredMessageIds: string[],
): ChapterCreatedEvent => ({
  type: "ChapterCreated",
  chapterId,
  title: "Chapter",
  summary: "Summary",
  coveredMessageIds,
});

describe("LLMChatProjection - Note Events", () => {
  let projection: LLMChatProjection;

  beforeEach(() => {
    projection = new LLMChatProjection();
  });

  describe("NoteCreated Event", () => {
    it("should add note message with formatted content", () => {
      const event = NoteCreatedEventUtil.Create("Use formal tone", 10);

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(
        "[Note]\nUse formal tone\n[End of Note]",
      );
    });

    it("should use system role for note messages", () => {
      const event = NoteCreatedEventUtil.Create("Note", 10);

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages[0].role).toBe("system");
    });

    it("should store expiresAfterMessages in message data", () => {
      const event = NoteCreatedEventUtil.Create("Note", 5);

      projection.process(event);

      const message = projection.GetMessage(event.noteId) as any;
      expect(message?.data?.expiresAfterMessages).toBe(5);
    });

    it("should store raw content in message data", () => {
      const event = NoteCreatedEventUtil.Create("Raw note content", 10);

      projection.process(event);

      const message = projection.GetMessage(event.noteId) as any;
      expect(message?.data?.rawContent).toBe("Raw note content");
    });

    it("should be retrievable by noteId", () => {
      const event = NoteCreatedEventUtil.Create("Note", 10);

      projection.process(event);

      const message = projection.GetMessage(event.noteId);
      expect(message).toBeDefined();
    });

    it("should mark note as not hidden", () => {
      const event = NoteCreatedEventUtil.Create("Note", 10);

      projection.process(event);

      const message = projection.GetMessage(event.noteId) as any;
      expect(message?.hidden).toBe(false);
    });

    it("should mark note as not deleted", () => {
      const event = NoteCreatedEventUtil.Create("Note", 10);

      projection.process(event);

      const message = projection.GetMessage(event.noteId) as any;
      expect(message?.deleted).toBe(false);
    });
  });

  describe("NoteEdited Event", () => {
    it("should update note formatted content", () => {
      const createEvent = NoteCreatedEventUtil.Create("Original", 10);
      projection.process(createEvent);

      projection.process(
        NoteEditedEventUtil.Create(createEvent.noteId, "Updated", 10),
      );

      const messages = projection.GetMessages();
      expect(messages[0].content).toBe("[Note]\nUpdated\n[End of Note]");
    });

    it("should update expiration in data", () => {
      const createEvent = NoteCreatedEventUtil.Create("Note", 10);
      projection.process(createEvent);

      projection.process(
        NoteEditedEventUtil.Create(createEvent.noteId, "Note", 20),
      );

      const message = projection.GetMessage(createEvent.noteId) as any;
      expect(message?.data?.expiresAfterMessages).toBe(20);
    });

    it("should update raw content in data", () => {
      const createEvent = NoteCreatedEventUtil.Create("Note", 10);
      projection.process(createEvent);

      projection.process(
        NoteEditedEventUtil.Create(createEvent.noteId, "New raw", 10),
      );

      const message = projection.GetMessage(createEvent.noteId) as any;
      expect(message?.data?.rawContent).toBe("New raw");
    });
  });

  describe("Note Content Formatting", () => {
    it("should wrap content with note markers", () => {
      projection.process(NoteCreatedEventUtil.Create("My note", 10));

      const messages = projection.GetMessages();
      expect(messages[0].content.startsWith("[Note]")).toBe(true);
      expect(messages[0].content.endsWith("[End of Note]")).toBe(true);
    });

    it("should preserve content between markers", () => {
      const content = "Step 1: Do this\nStep 2: Do that";
      projection.process(NoteCreatedEventUtil.Create(content, 10));

      const messages = projection.GetMessages();
      expect(messages[0].content).toContain(content);
    });

    it("should use formatNoteContent method consistently", () => {
      const formatted = projection.formatNoteContent("Test content");
      expect(formatted).toBe("[Note]\nTest content\n[End of Note]");
    });
  });

  describe("Note Expiration in LLM Context", () => {
    it("should exclude expired notes from LLM context", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Note", 2);
      projection.process(noteEvent);

      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));
      projection.process(
        MessageCreatedEventUtil.Create("assistant", "Reply 1"),
      );

      const messages = projection.GetMessages();
      const noteMessages = messages.filter((m) =>
        m.content.includes("[Note]"),
      );
      expect(noteMessages).toHaveLength(0);
    });

    it("should include non-expired notes in LLM context", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Note", 10);
      projection.process(noteEvent);

      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));

      const messages = projection.GetMessages();
      const noteMessages = messages.filter((m) =>
        m.content.includes("[Note]"),
      );
      expect(noteMessages).toHaveLength(1);
    });

    it("should never expire notes with null expiration", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Permanent", null);
      projection.process(noteEvent);

      for (let i = 0; i < 100; i++) {
        projection.process(
          MessageCreatedEventUtil.Create("user", `Msg ${i}`),
        );
      }

      const messages = projection.GetMessages();
      const noteMessages = messages.filter((m) =>
        m.content.includes("[Note]"),
      );
      expect(noteMessages).toHaveLength(1);
    });

    it("should handle multiple notes with different expirations", () => {
      projection.process(NoteCreatedEventUtil.Create("Short", 1));
      projection.process(NoteCreatedEventUtil.Create("Long", 10));

      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));

      const messages = projection.GetMessages();
      const noteMessages = messages.filter((m) =>
        m.content.includes("[Note]"),
      );
      expect(noteMessages).toHaveLength(1);
      expect(noteMessages[0].content).toContain("Long");
    });

    it("should place notes chronologically among other messages", () => {
      projection.process(MessageCreatedEventUtil.Create("user", "Message 1"));
      projection.process(NoteCreatedEventUtil.Create("Note content", null));
      projection.process(
        MessageCreatedEventUtil.Create("assistant", "Response"),
      );

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("system");
      expect(messages[1].content).toContain("[Note]");
      expect(messages[2].role).toBe("assistant");
    });
  });

  describe("Chapter-Note Interaction", () => {
    it("should not hide note messages when chapter covers their IDs", () => {
      const msg = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msg);
      const noteEvent = NoteCreatedEventUtil.Create("Note content", null);
      projection.process(noteEvent);

      projection.process(
        createChapterEvent("ch-1", [msg.messageId, noteEvent.noteId]),
      );

      // Add messages after chapter so buffer logic doesn't re-inject covered messages
      for (let i = 0; i < 10; i++) {
        projection.process(
          MessageCreatedEventUtil.Create("user", `Post ${i}`),
        );
      }

      const messages = projection.GetMessages();
      const noteMessages = messages.filter((m) =>
        m.content.includes("[Note]"),
      );
      expect(noteMessages).toHaveLength(1);
    });

    it("should still hide regular messages when chapter covers them alongside notes", () => {
      const msg1 = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msg1);
      const noteEvent = NoteCreatedEventUtil.Create("Note", null);
      projection.process(noteEvent);
      const msg2 = MessageCreatedEventUtil.Create("assistant", "Hi there");
      projection.process(msg2);

      projection.process(
        createChapterEvent("ch-1", [
          msg1.messageId,
          noteEvent.noteId,
          msg2.messageId,
        ]),
      );

      // Add enough messages after so buffer doesn't re-include hidden messages
      for (let i = 0; i < 10; i++) {
        projection.process(
          MessageCreatedEventUtil.Create("user", `Post chapter ${i}`),
        );
      }

      const messages = projection.GetMessages();
      const hasHello = messages.some(
        (m) => m.content === "Hello" && m.role === "user",
      );
      const hasHiThere = messages.some(
        (m) => m.content === "Hi there" && m.role === "assistant",
      );
      expect(hasHello).toBe(false);
      expect(hasHiThere).toBe(false);

      // But the note should still be visible
      const hasNote = messages.some((m) => m.content.includes("[Note]"));
      expect(hasNote).toBe(true);
    });

    it("should keep note visible alongside chapter summary", () => {
      const msg = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msg);
      const noteEvent = NoteCreatedEventUtil.Create("Note content", null);
      projection.process(noteEvent);

      projection.process(
        createChapterEvent("ch-1", [msg.messageId, noteEvent.noteId]),
      );

      // Add messages after chapter so buffer logic doesn't interfere
      for (let i = 0; i < 10; i++) {
        projection.process(
          MessageCreatedEventUtil.Create("user", `Post ${i}`),
        );
      }

      const messages = projection.GetMessages();
      const hasNote = messages.some((m) => m.content.includes("[Note]"));
      const hasChapter = messages.some((m) =>
        m.content.includes("[Previous Chapter Summary:"),
      );
      expect(hasNote).toBe(true);
      expect(hasChapter).toBe(true);
    });
  });
});
