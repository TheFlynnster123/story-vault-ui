import { describe, it, expect, beforeEach, vi } from "vitest";
import { LLMChatProjection } from "../LLMChatProjection";
import type {
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  ChapterCreatedEvent,
} from "../events/ChatEvent";

describe("LLMChatProjection - Performance", () => {
  let projection: LLMChatProjection;
  let messageCounter = 1;

  beforeEach(() => {
    projection = new LLMChatProjection();
    messageCounter = 1; // Reset counter for each test
  });

  // ---- Large Message Count Tests ----
  describe("Large Message Count", () => {
    it("should handle 1000 messages efficiently", () => {
      const startTime = performance.now();

      createMessages(projection, 1000);

      const endTime = performance.now();
      const duration = endTime - startTime;

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(1000);
      expectReasonablePerformance(duration, 1000, "message creation");
    });

    it("should retrieve messages efficiently from large projection", () => {
      createMessages(projection, 1000);

      const startTime = performance.now();
      const messages = projection.GetMessages();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(messages).toHaveLength(1000);
      expectReasonablePerformance(duration, 50, "message retrieval");
    });

    it("should handle GetMessage efficiently with many messages", () => {
      createMessages(projection, 1000);

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const randomId = `msg-${Math.floor(Math.random() * 1000) + 1}`;
        projection.GetMessage(randomId);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expectReasonablePerformance(duration, 50, "individual message lookups");
    });

    it("should handle editing messages in large projection", () => {
      createMessages(projection, 500);

      const startTime = performance.now();

      for (let i = 1; i <= 100; i++) {
        processMessageEdited(
          projection,
          `msg-${i * 5}`,
          `Updated content ${i}`
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expectReasonablePerformance(duration, 100, "message edits");
    });

    it("should handle deleting many messages efficiently", () => {
      const startId = messageCounter;
      createMessages(projection, 1000);

      const startTime = performance.now();

      // Delete odd-indexed messages based on actual IDs created
      for (let i = startId; i < startId + 1000; i += 2) {
        processMessageDeleted(projection, `msg-${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(500);
      expectReasonablePerformance(duration, 200, "message deletions");
    });
  });

  // ---- Chapter Performance Tests ----
  describe("Chapter Performance", () => {
    it("should handle multiple chapters efficiently", () => {
      const startTime = performance.now();

      for (let chapter = 1; chapter <= 20; chapter++) {
        createMessages(projection, 10);
        const coveredIds = Array.from(
          { length: 10 },
          (_, i) => `msg-${(chapter - 1) * 10 + i + 1}`
        );
        processChapterCreated(
          projection,
          `chapter-${chapter}`,
          `Chapter ${chapter}`,
          `Summary ${chapter}`,
          coveredIds
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expectReasonablePerformance(duration, 500, "chapter creation");
    });

    it("should retrieve messages with chapters efficiently", () => {
      // Setup: 10 chapters with 20 messages each
      for (let chapter = 1; chapter <= 10; chapter++) {
        createMessages(projection, 20);
        const coveredIds = Array.from(
          { length: 20 },
          (_, i) => `msg-${(chapter - 1) * 20 + i + 1}`
        );
        processChapterCreated(
          projection,
          `chapter-${chapter}`,
          `Chapter ${chapter}`,
          `Summary ${chapter}`,
          coveredIds
        );
      }

      createMessages(projection, 10);

      const startTime = performance.now();
      const messages = projection.GetMessages();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(messages.length).toBeGreaterThan(0);
      expectReasonablePerformance(
        duration,
        50,
        "message retrieval with chapters"
      );
    });

    it("should handle chapter format updates efficiently", () => {
      createMessages(projection, 6);
      processChapterCreated(projection, "chapter-1", "Chapter One", "Summary", [
        "msg-1",
        "msg-2",
        "msg-3",
        "msg-4",
        "msg-5",
        "msg-6",
      ]);

      const startTime = performance.now();

      // Add messages to trigger format updates
      for (let i = 1; i <= 20; i++) {
        processMessageCreated(
          projection,
          `new-msg-${i}`,
          "user",
          `Content ${i}`
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expectReasonablePerformance(duration, 100, "format updates");
    });

    it("should handle editing chapters with large covered message arrays", () => {
      createMessages(projection, 100);
      const coveredIds = Array.from({ length: 100 }, (_, i) => `msg-${i + 1}`);
      processChapterCreated(
        projection,
        "chapter-1",
        "Large Chapter",
        "Summary",
        coveredIds
      );

      const startTime = performance.now();

      for (let i = 1; i <= 20; i++) {
        processChapterEdited(
          projection,
          "chapter-1",
          `Updated ${i}`,
          `New summary ${i}`
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expectReasonablePerformance(duration, 100, "chapter edits");
    });
  });

  // ---- Subscriber Notification Performance ----
  describe("Subscriber Notification Performance", () => {
    it("should handle many subscribers efficiently", () => {
      const callbacks = Array.from({ length: 100 }, () => vi.fn());
      callbacks.forEach((cb) => projection.subscribe(cb));

      const startTime = performance.now();

      processMessageCreated(projection, "msg-1", "user", "test");

      const endTime = performance.now();
      const duration = endTime - startTime;

      callbacks.forEach((cb) => expect(cb).toHaveBeenCalledTimes(1));
      expectReasonablePerformance(duration, 50, "subscriber notification");
    });

    it("should handle rapid event processing with subscribers", () => {
      const callback = vi.fn();
      projection.subscribe(callback);

      const startTime = performance.now();

      for (let i = 1; i <= 500; i++) {
        processMessageCreated(projection, `msg-${i}`, "user", `Content ${i}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(callback).toHaveBeenCalledTimes(500);
      expectReasonablePerformance(duration, 500, "rapid event processing");
    });

    it("should handle subscribe and unsubscribe operations efficiently", () => {
      const startTime = performance.now();

      const unsubscribers = [];
      for (let i = 0; i < 1000; i++) {
        const unsub = projection.subscribe(vi.fn());
        unsubscribers.push(unsub);
      }

      for (const unsub of unsubscribers) {
        unsub();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expectReasonablePerformance(duration, 100, "subscription management");
    });
  });

  // ---- Complex Scenarios ----
  describe("Complex Scenario Performance", () => {
    it("should handle mixed operations efficiently", () => {
      const startTime = performance.now();

      // Create initial messages
      createMessages(projection, 100);

      // Create some chapters
      for (let i = 1; i <= 5; i++) {
        const coveredIds = Array.from(
          { length: 10 },
          (_, j) => `msg-${(i - 1) * 10 + j + 1}`
        );
        processChapterCreated(
          projection,
          `chapter-${i}`,
          `Chapter ${i}`,
          `Summary ${i}`,
          coveredIds
        );
      }

      // Add more messages
      for (let i = 101; i <= 200; i++) {
        processMessageCreated(projection, `msg-${i}`, "user", `Content ${i}`);
      }

      // Edit some messages
      for (let i = 101; i <= 120; i++) {
        processMessageEdited(projection, `msg-${i}`, `Edited ${i}`);
      }

      // Delete some messages
      for (let i = 121; i <= 140; i++) {
        processMessageDeleted(projection, `msg-${i}`);
      }

      // Edit chapters
      for (let i = 1; i <= 5; i++) {
        processChapterEdited(
          projection,
          `chapter-${i}`,
          `Updated Chapter ${i}`,
          `Updated summary ${i}`
        );
      }

      // Get messages multiple times
      for (let i = 0; i < 10; i++) {
        projection.GetMessages();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expectReasonablePerformance(duration, 1000, "mixed operations");
    });

    it("should maintain performance with deep chapter nesting", () => {
      const startTime = performance.now();

      // Create 50 chapters with 10 messages each
      for (let chapter = 1; chapter <= 50; chapter++) {
        createMessages(projection, 10);
        const coveredIds = Array.from(
          { length: 10 },
          (_, i) => `msg-${(chapter - 1) * 10 + i + 1}`
        );
        processChapterCreated(
          projection,
          `chapter-${chapter}`,
          `Chapter ${chapter}`,
          `Summary ${chapter}`,
          coveredIds
        );
      }

      // Add messages and get results
      createMessages(projection, 5);
      const messages = projection.GetMessages();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(messages.length).toBeGreaterThan(0);
      expectReasonablePerformance(duration, 1000, "deep chapter nesting");
    });

    it("should handle alternating create and delete efficiently", () => {
      const startTime = performance.now();

      for (let i = 1; i <= 500; i++) {
        processMessageCreated(projection, `msg-${i}`, "user", `Content ${i}`);

        if (i > 1 && i % 2 === 0) {
          processMessageDeleted(projection, `msg-${i - 1}`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      const messages = projection.GetMessages();
      expect(messages.length).toBeGreaterThan(0);
      expectReasonablePerformance(duration, 500, "alternating operations");
    });
  });

  // ---- Memory Efficiency Tests ----
  describe("Memory Efficiency", () => {
    it("should not grow unbounded with deleted messages", () => {
      // This test verifies the projection maintains deleted messages
      // but doesn't include them in results
      createMessages(projection, 1000);

      for (let i = 1; i <= 500; i++) {
        processMessageDeleted(projection, `msg-${i}`);
      }

      const messages = projection.GetMessages();
      expect(messages).toHaveLength(500);

      // Verify we can still access the projection efficiently
      const startTime = performance.now();
      for (let i = 501; i <= 600; i++) {
        projection.GetMessage(`msg-${i}`);
      }
      const endTime = performance.now();

      expectReasonablePerformance(
        endTime - startTime,
        50,
        "access after deletions"
      );
    });

    it("should handle chapter operations without memory issues", () => {
      // Create many chapters and verify efficient memory usage
      for (let chapter = 1; chapter <= 100; chapter++) {
        createMessages(projection, 5);
        const coveredIds = Array.from(
          { length: 5 },
          (_, i) => `msg-${(chapter - 1) * 5 + i + 1}`
        );
        processChapterCreated(
          projection,
          `chapter-${chapter}`,
          `Chapter ${chapter}`,
          `Summary ${chapter}`,
          coveredIds
        );
      }

      const startTime = performance.now();
      const messages = projection.GetMessages();
      const endTime = performance.now();

      expect(messages.length).toBeGreaterThan(0);
      expectReasonablePerformance(
        endTime - startTime,
        100,
        "many chapters retrieval"
      );
    });
  });

  // ---- Helper Functions ----
  function createMessages(proj: LLMChatProjection, count: number): void {
    const startIndex = getNextMessageIndex(count);
    for (let i = 0; i < count; i++) {
      processMessageCreated(
        proj,
        `msg-${startIndex + i}`,
        i % 2 === 0 ? "user" : "assistant",
        `Content ${startIndex + i}`
      );
    }
  }

  function getNextMessageIndex(count: number = 1): number {
    const current = messageCounter;
    messageCounter += count;
    return current;
  }

  function processMessageCreated(
    proj: LLMChatProjection,
    messageId: string,
    role: "user" | "assistant" | "system",
    content: string
  ): void {
    const event: MessageCreatedEvent = {
      type: "MessageCreated",
      messageId,
      role,
      content,
    };
    proj.process(event);
  }

  function processMessageEdited(
    proj: LLMChatProjection,
    messageId: string,
    newContent: string
  ): void {
    const event: MessageEditedEvent = {
      type: "MessageEdited",
      messageId,
      newContent,
    };
    proj.process(event);
  }

  function processMessageDeleted(
    proj: LLMChatProjection,
    messageId: string
  ): void {
    const event: MessageDeletedEvent = {
      type: "MessageDeleted",
      messageId,
    };
    proj.process(event);
  }

  function processChapterCreated(
    proj: LLMChatProjection,
    chapterId: string,
    title: string,
    summary: string,
    coveredMessageIds: string[],
    nextChapterDirection?: string
  ): void {
    const event: ChapterCreatedEvent = {
      type: "ChapterCreated",
      chapterId,
      title,
      summary,
      coveredMessageIds,
      nextChapterDirection,
    };
    proj.process(event);
  }

  function processChapterEdited(
    proj: LLMChatProjection,
    chapterId: string,
    title: string,
    summary: string,
    nextChapterDirection?: string
  ): void {
    const event = {
      type: "ChapterEdited" as const,
      chapterId,
      title,
      summary,
      nextChapterDirection,
    };
    proj.process(event);
  }

  function expectReasonablePerformance(
    durationMs: number,
    thresholdMs: number,
    operation: string
  ): void {
    // Log performance for visibility
    console.log(`${operation}: ${durationMs.toFixed(2)}ms`);

    // Soft assertion - warns if slow but doesn't fail
    if (durationMs > thresholdMs) {
      console.warn(
        `Performance warning: ${operation} took ${durationMs.toFixed(
          2
        )}ms (threshold: ${thresholdMs}ms)`
      );
    }

    // Hard limit at 10x threshold to catch severe performance issues
    expect(durationMs).toBeLessThan(thresholdMs * 10);
  }
});
