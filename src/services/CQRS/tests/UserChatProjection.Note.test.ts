import { describe, it, expect, beforeEach } from "vitest";
import { UserChatProjection } from "../UserChatProjection";
import type { NoteChatMessage } from "../UserChatProjection";
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

describe("UserChatProjection - Note Events", () => {
  let projection: UserChatProjection;

  beforeEach(() => {
    projection = new UserChatProjection();
  });

  describe("NoteCreated Event", () => {
    it("should add note message to messages", () => {
      const event = NoteCreatedEventUtil.Create("Use formal tone", 10);

      projection.process(event);

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("note");
      expect(messages[0].content).toBe("Use formal tone");
    });

    it("should store expiresAfterMessages in data", () => {
      const event = NoteCreatedEventUtil.Create("Note content", 5);

      projection.process(event);

      const note = projection.GetMessages()[0] as NoteChatMessage;
      expect(note.data.expiresAfterMessages).toBe(5);
    });

    it("should store null expiration for permanent notes", () => {
      const event = NoteCreatedEventUtil.Create("Permanent note", null);

      projection.process(event);

      const note = projection.GetMessages()[0] as NoteChatMessage;
      expect(note.data.expiresAfterMessages).toBeNull();
    });

    it("should mark note as not expired initially", () => {
      const event = NoteCreatedEventUtil.Create("Note", 10);

      projection.process(event);

      const note = projection.GetMessages()[0] as NoteChatMessage;
      expect(note.data.expired).toBe(false);
    });

    it("should use noteId from event", () => {
      const event = NoteCreatedEventUtil.Create("Note", 10);

      projection.process(event);

      const message = projection.GetMessage(event.noteId);
      expect(message).toBeDefined();
      expect(message?.type).toBe("note");
    });

    it("should mark note as not deleted", () => {
      const event = NoteCreatedEventUtil.Create("Note", 10);

      projection.process(event);

      const note = projection.GetMessage(event.noteId);
      expect(note?.deleted).toBe(false);
    });

    it("should not set hiddenByChapterId", () => {
      const event = NoteCreatedEventUtil.Create("Note", 10);

      projection.process(event);

      const note = projection.GetMessage(event.noteId);
      expect(note?.hiddenByChapterId).toBeUndefined();
    });

    it("should appear after existing messages in timeline", () => {
      const msgEvent = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msgEvent);

      const noteEvent = NoteCreatedEventUtil.Create("Note", 10);
      projection.process(noteEvent);

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].type).toBe("user-message");
      expect(messages[1].type).toBe("note");
    });

    it("should support multiple notes", () => {
      projection.process(NoteCreatedEventUtil.Create("Note A", 10));
      projection.process(NoteCreatedEventUtil.Create("Note B", null));

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("Note A");
      expect(messages[1].content).toBe("Note B");
    });
  });

  describe("NoteEdited Event", () => {
    it("should update note content", () => {
      const createEvent = NoteCreatedEventUtil.Create("Original", 10);
      projection.process(createEvent);

      const editEvent = NoteEditedEventUtil.Create(
        createEvent.noteId,
        "Updated content",
        10,
      );
      projection.process(editEvent);

      const note = projection.GetMessages()[0] as NoteChatMessage;
      expect(note.content).toBe("Updated content");
    });

    it("should update expiration", () => {
      const createEvent = NoteCreatedEventUtil.Create("Note", 10);
      projection.process(createEvent);

      const editEvent = NoteEditedEventUtil.Create(
        createEvent.noteId,
        "Note",
        20,
      );
      projection.process(editEvent);

      const note = projection.GetMessages()[0] as NoteChatMessage;
      expect(note.data.expiresAfterMessages).toBe(20);
    });

    it("should allow changing expiration to null", () => {
      const createEvent = NoteCreatedEventUtil.Create("Note", 10);
      projection.process(createEvent);

      const editEvent = NoteEditedEventUtil.Create(
        createEvent.noteId,
        "Note",
        null,
      );
      projection.process(editEvent);

      const note = projection.GetMessages()[0] as NoteChatMessage;
      expect(note.data.expiresAfterMessages).toBeNull();
    });

    it("should not affect other notes", () => {
      const note1 = NoteCreatedEventUtil.Create("Note A", 10);
      const note2 = NoteCreatedEventUtil.Create("Note B", 5);
      projection.process(note1);
      projection.process(note2);

      projection.process(
        NoteEditedEventUtil.Create(note1.noteId, "Updated A", 20),
      );

      const messages = projection.GetMessages();
      expect((messages[0] as NoteChatMessage).content).toBe("Updated A");
      expect((messages[1] as NoteChatMessage).content).toBe("Note B");
    });
  });

  describe("Note Expiration", () => {
    it("should mark note as expired when enough messages follow", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Note", 2);
      projection.process(noteEvent);

      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));
      projection.process(
        MessageCreatedEventUtil.Create("assistant", "Reply 1"),
      );

      const messages = projection.GetMessages();
      const note = messages.find((m) => m.type === "note") as NoteChatMessage;
      expect(note.data.expired).toBe(true);
    });

    it("should not expire note when insufficient messages follow", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Note", 5);
      projection.process(noteEvent);

      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));
      projection.process(
        MessageCreatedEventUtil.Create("assistant", "Reply 1"),
      );

      const messages = projection.GetMessages();
      const note = messages.find((m) => m.type === "note") as NoteChatMessage;
      expect(note.data.expired).toBe(false);
    });

    it("should never expire notes with null expiration", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Permanent note", null);
      projection.process(noteEvent);

      // Add many messages
      for (let i = 0; i < 100; i++) {
        projection.process(
          MessageCreatedEventUtil.Create("user", `Msg ${i}`),
        );
      }

      const messages = projection.GetMessages();
      const note = messages.find((m) => m.type === "note") as NoteChatMessage;
      expect(note.data.expired).toBe(false);
    });

    it("should only count user/assistant/system messages toward expiration", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Note", 2);
      projection.process(noteEvent);

      // Add another note (should not count)
      projection.process(NoteCreatedEventUtil.Create("Other note", null));

      // Add only 1 qualifying message
      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));

      const messages = projection.GetMessages();
      const note = messages.find(
        (m) => m.type === "note" && m.content === "Note",
      ) as NoteChatMessage;
      expect(note.data.expired).toBe(false);
    });

    it("should expire note when exact threshold is reached", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Note", 1);
      projection.process(noteEvent);

      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));

      const messages = projection.GetMessages();
      const note = messages.find((m) => m.type === "note") as NoteChatMessage;
      expect(note.data.expired).toBe(true);
    });

    it("should handle multiple notes with different expirations", () => {
      const note1 = NoteCreatedEventUtil.Create("Short note", 1);
      projection.process(note1);
      const note2 = NoteCreatedEventUtil.Create("Long note", 5);
      projection.process(note2);

      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));

      const messages = projection.GetMessages();
      const shortNote = messages.find(
        (m) => m.type === "note" && m.content === "Short note",
      ) as NoteChatMessage;
      const longNote = messages.find(
        (m) => m.type === "note" && m.content === "Long note",
      ) as NoteChatMessage;

      expect(shortNote.data.expired).toBe(true);
      expect(longNote.data.expired).toBe(false);
    });

    it("should still show expired notes in GetMessages", () => {
      const noteEvent = NoteCreatedEventUtil.Create("Note", 1);
      projection.process(noteEvent);
      projection.process(MessageCreatedEventUtil.Create("user", "Msg 1"));

      const messages = projection.GetMessages();
      const notes = messages.filter((m) => m.type === "note");
      expect(notes).toHaveLength(1);
    });
  });

  describe("Chapter-Note Interaction", () => {
    it("should not hide note messages when chapter covers their IDs", () => {
      const msg = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msg);
      const noteEvent = NoteCreatedEventUtil.Create("Note", 10);
      projection.process(noteEvent);

      projection.process(
        createChapterEvent("ch-1", [msg.messageId, noteEvent.noteId]),
      );

      const messages = projection.GetMessages();
      const noteMessages = messages.filter((m) => m.type === "note");
      expect(noteMessages).toHaveLength(1);
      expect(noteMessages[0].content).toBe("Note");
    });

    it("should still hide regular messages when chapter covers them alongside notes", () => {
      const msg1 = MessageCreatedEventUtil.Create("user", "Hello");
      const msg2 = MessageCreatedEventUtil.Create("assistant", "Hi there");
      projection.process(msg1);
      projection.process(msg2);

      projection.process(
        createChapterEvent("ch-1", [msg1.messageId, msg2.messageId]),
      );

      const messages = projection.GetMessages();
      const userMessages = messages.filter(
        (m) => m.type === "user-message" || m.type === "assistant",
      );
      expect(userMessages).toHaveLength(0);
    });

    it("should keep note visible alongside chapter in timeline", () => {
      const msg = MessageCreatedEventUtil.Create("user", "Hello");
      projection.process(msg);
      const noteEvent = NoteCreatedEventUtil.Create("Note", 10);
      projection.process(noteEvent);

      projection.process(
        createChapterEvent("ch-1", [msg.messageId, noteEvent.noteId]),
      );

      const messages = projection.GetMessages();
      const types = messages.map((m) => m.type);
      expect(types).toContain("note");
      expect(types).toContain("chapter");
    });
  });
});
