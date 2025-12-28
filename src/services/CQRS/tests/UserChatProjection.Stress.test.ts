import { describe, it, expect } from "vitest";
import { UserChatProjection } from "../UserChatProjection";
import type {
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  ChapterCreatedEvent,
} from "../events/ChatEvent";

describe("UserChatProjection - Performance Stress Tests", () => {
  describe("Large-Scale Message Processing", () => {
    it("should process 50,000 message additions in under 10 seconds", () => {
      const projection = new UserChatProjection();
      const startTime = Date.now();

      // Generate and process 50,000 messages
      for (let i = 0; i < 50000; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: i % 3 === 0 ? "user" : i % 3 === 1 ? "assistant" : "system",
          content: `Message content ${i}`,
        };
        projection.process(event);
      }

      const duration = Date.now() - startTime;

      expect(projection.Messages).toHaveLength(50000);
      expect(duration).toBeLessThan(10000); // Less than 10 seconds
      console.log(`✓ Processed 50,000 messages in ${duration}ms`);
    });

    it("should process 10,000 message edits in under 2 seconds", () => {
      const projection = new UserChatProjection();

      // Add 10,000 messages first
      for (let i = 0; i < 10000; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: "user",
          content: `Original ${i}`,
        };
        projection.process(event);
      }

      const startTime = Date.now();

      // Edit all 10,000 messages
      for (let i = 0; i < 10000; i++) {
        const event: MessageEditedEvent = {
          type: "MessageEdited",
          messageId: `msg-${i}`,
          newContent: `Edited ${i}`,
        };
        projection.process(event);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Less than 2 seconds
      expect(projection.Messages[0].content).toBe("Edited 0");
      expect(projection.Messages[9999].content).toBe("Edited 9999");
      console.log(`✓ Edited 10,000 messages in ${duration}ms`);
    });

    it("should process 10,000 message deletions in under 2 seconds", () => {
      const projection = new UserChatProjection();

      // Add 10,000 messages first
      for (let i = 0; i < 10000; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: "user",
          content: `Content ${i}`,
        };
        projection.process(event);
      }

      const startTime = Date.now();

      // Delete all 10,000 messages
      for (let i = 0; i < 10000; i++) {
        const event: MessageDeletedEvent = {
          type: "MessageDeleted",
          messageId: `msg-${i}`,
        };
        projection.process(event);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Less than 2 seconds
      expect(projection.Messages.every((m) => m.deleted === true)).toBe(true);
      console.log(`✓ Deleted 10,000 messages in ${duration}ms`);
    });

    it("should retrieve visible messages from 50,000 total messages in under 100ms", () => {
      const projection = new UserChatProjection();

      // Add 50,000 messages (half will be deleted)
      for (let i = 0; i < 50000; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: "user",
          content: `Content ${i}`,
        };
        projection.process(event);
      }

      // Delete every other message
      for (let i = 0; i < 50000; i += 2) {
        const event: MessageDeletedEvent = {
          type: "MessageDeleted",
          messageId: `msg-${i}`,
        };
        projection.process(event);
      }

      const startTime = Date.now();
      const visibleMessages = projection.GetMessages();
      const duration = Date.now() - startTime;

      expect(visibleMessages).toHaveLength(25000);
      expect(duration).toBeLessThan(100); // Less than 100ms
      console.log(
        `✓ Retrieved 25,000 visible messages from 50,000 total in ${duration}ms`
      );
    });
  });

  describe("Large-Scale Chapter Processing", () => {
    it("should process 1,000 chapters each covering 50 messages in under 5 seconds", () => {
      const projection = new UserChatProjection();

      // Add 50,000 messages (50 messages per chapter × 1,000 chapters)
      for (let i = 0; i < 50000; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: "user",
          content: `Content ${i}`,
        };
        projection.process(event);
      }

      const startTime = Date.now();

      // Create 1,000 chapters, each covering 50 messages
      for (let chapter = 0; chapter < 1000; chapter++) {
        const startMsg = chapter * 50;
        const coveredMessageIds = Array.from(
          { length: 50 },
          (_, i) => `msg-${startMsg + i}`
        );

        const event: ChapterCreatedEvent = {
          type: "ChapterCreated",
          chapterId: `chapter-${chapter}`,
          title: `Chapter ${chapter}`,
          summary: `Summary for chapter ${chapter}`,
          coveredMessageIds,
        };
        projection.process(event);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Less than 5 seconds
      // 50,000 messages + 1,000 chapters = 51,000 total
      expect(projection.Messages).toHaveLength(51000);
      console.log(
        `✓ Created 1,000 chapters covering 50,000 messages in ${duration}ms`
      );
    });

    it("should retrieve chapter messages from large projection in under 10ms", () => {
      const projection = new UserChatProjection();

      // Add 10,000 messages
      for (let i = 0; i < 10000; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: "user",
          content: `Content ${i}`,
        };
        projection.process(event);
      }

      // Create chapter covering 1,000 messages
      const coveredMessageIds = Array.from(
        { length: 1000 },
        (_, i) => `msg-${i}`
      );
      const chapterEvent: ChapterCreatedEvent = {
        type: "ChapterCreated",
        chapterId: "large-chapter",
        title: "Large Chapter",
        summary: "Covers 1,000 messages",
        coveredMessageIds,
      };
      projection.process(chapterEvent);

      const startTime = Date.now();
      const chapterMessages = projection.getChapterMessages("large-chapter");
      const duration = Date.now() - startTime;

      expect(chapterMessages).toHaveLength(1000);
      expect(duration).toBeLessThan(10); // Less than 10ms
      console.log(`✓ Retrieved 1,000 chapter messages in ${duration}ms`);
    });
  });

  describe("Mixed Operations at Scale", () => {
    it("should handle 10,000 mixed operations (add/edit/delete) in under 3 seconds", () => {
      const projection = new UserChatProjection();
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        const operation = i % 3;

        if (operation === 0) {
          // Add message
          const event: MessageCreatedEvent = {
            type: "MessageCreated",
            messageId: `msg-${i}`,
            role: "user",
            content: `Content ${i}`,
          };
          projection.process(event);
        } else if (operation === 1 && i > 0) {
          // Edit previous message
          const event: MessageEditedEvent = {
            type: "MessageEdited",
            messageId: `msg-${i - 1}`,
            newContent: `Edited content ${i - 1}`,
          };
          projection.process(event);
        } else if (operation === 2 && i > 1) {
          // Delete message from 2 steps ago
          const event: MessageDeletedEvent = {
            type: "MessageDeleted",
            messageId: `msg-${i - 2}`,
          };
          projection.process(event);
        }
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000); // Less than 3 seconds
      console.log(`✓ Processed 10,000 mixed operations in ${duration}ms`);
    });

    it("should handle 1,000 subscribers being notified for 1,000 events in under 5 seconds", () => {
      const projection = new UserChatProjection();
      const callbacks: Array<() => void> = [];

      // Add 1,000 subscribers
      for (let i = 0; i < 1000; i++) {
        const callback = () => {
          // Minimal callback work
        };
        callbacks.push(callback);
        projection.subscribe(callback);
      }

      const startTime = Date.now();

      // Process 1,000 events (each triggers all 1,000 subscribers)
      for (let i = 0; i < 1000; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: "user",
          content: `Content ${i}`,
        };
        projection.process(event);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Less than 5 seconds
      expect(projection.Messages).toHaveLength(1000);
      console.log(
        `✓ Notified 1,000 subscribers 1,000 times (1M notifications) in ${duration}ms`
      );
    });
  });

  describe("Memory Efficiency", () => {
    it("should maintain reasonable memory with 100,000 messages", async () => {
      const projection = new UserChatProjection();

      // Add 100,000 messages
      for (let i = 0; i < 100000; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: "user",
          content: `Content ${i}`,
        };
        projection.process(event);
      }

      expect(projection.Messages).toHaveLength(100000);

      // Verify we can still efficiently query
      const startTime = Date.now();
      const message = projection.GetMessage("msg-50000");
      const duration = Date.now() - startTime;

      console.log("Duration");
      console.log(duration);

      expect(message).toBeDefined();
      expect(duration).toBeLessThanOrEqual(1); // Should be near-instant (allowing for Date.now() precision)
      console.log(
        `✓ Maintained 100,000 messages with efficient lookups (${duration}ms)`
      );
    });
  });
});
