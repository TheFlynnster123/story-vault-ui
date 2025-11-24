import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  UserChatProjection,
  getUserChatProjectionInstance,
} from "./UserChatProjection";
import type {
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MessagesDeletedEvent,
  CivitJobCreatedEvent,
} from "./events/ChatEvent";

describe("UserChatProjection - Core Operations", () => {
  let projection: UserChatProjection;

  beforeEach(() => {
    projection = new UserChatProjection();
  });

  // ---- Initialization Tests ----
  describe("Initialization", () => {
    it("should initialize with empty Messages array", () => {
      expect(projection.Messages).toEqual([]);
    });

    it("should initialize with empty subscribers set", () => {
      // Verify by subscribing and checking no prior callbacks exist
      const callback = vi.fn();
      projection.subscribe(callback);

      // Process an event to trigger notification
      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };
      projection.process(event);

      // Should only call the one subscriber we just added
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Singleton Pattern Tests ----
  describe("Singleton Pattern", () => {
    it("should return same instance for same chatId", () => {
      const instance1 = getUserChatProjectionInstance("chat-123");
      const instance2 = getUserChatProjectionInstance("chat-123");

      expect(instance1).toBe(instance2);
    });

    it("should return different instances for different chatIds", () => {
      const instance1 = getUserChatProjectionInstance("chat-123");
      const instance2 = getUserChatProjectionInstance("chat-456");

      expect(instance1).not.toBe(instance2);
    });

    it("should return null for null chatId", () => {
      const instance = getUserChatProjectionInstance(null);

      expect(instance).toBeNull();
    });
  });

  // ---- Subscribe/Notify Tests ----
  describe("Subscribe/Notify Pattern", () => {
    it("should add subscriber and return unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = projection.subscribe(callback);

      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it("should call all subscribers when event is processed", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      projection.subscribe(callback1);
      projection.subscribe(callback2);

      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };
      projection.process(event);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should remove subscriber when unsubscribe is called", () => {
      const callback = vi.fn();
      const unsubscribe = projection.subscribe(callback);

      unsubscribe();

      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };
      projection.process(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should notify subscribers after processing any event type", () => {
      const callback = vi.fn();
      projection.subscribe(callback);

      const events = [
        {
          type: "MessageCreated",
          messageId: "m1",
          role: "user",
          content: "test",
          timestamp: Date.now(),
        } as MessageCreatedEvent,
        {
          type: "MessageEdited",
          messageId: "m1",
          newContent: "edited",
          timestamp: Date.now(),
        } as MessageEditedEvent,
        {
          type: "MessageDeleted",
          messageId: "m1",
          timestamp: Date.now(),
        } as MessageDeletedEvent,
      ];

      events.forEach((event) => projection.process(event));

      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  // ---- MessageCreated Event Tests ----
  describe("MessageCreated Event Processing", () => {
    it("should add user message with correct type 'user-message'", () => {
      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "Hello",
      };

      projection.process(event);

      expect(projection.Messages).toHaveLength(1);
      expect(projection.Messages[0].type).toBe("user-message");
      expect(projection.Messages[0].id).toBe("msg-1");
      expect(projection.Messages[0].content).toBe("Hello");
    });

    it("should add system message with correct type 'system-message'", () => {
      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "system",
        content: "System message",
      };

      projection.process(event);

      expect(projection.Messages[0].type).toBe("system-message");
    });

    it("should add assistant message with correct type 'assistant'", () => {
      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "assistant",
        content: "Assistant response",
      };

      projection.process(event);

      expect(projection.Messages[0].type).toBe("assistant");
    });

    it("should initialize message with hiddenByChapterId as undefined", () => {
      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };

      projection.process(event);

      expect(projection.Messages[0].hiddenByChapterId).toBeUndefined();
    });

    it("should initialize message with deleted as false", () => {
      const event: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };

      projection.process(event);

      expect(projection.Messages[0].deleted).toBe(false);
    });
  });

  // ---- MessageEdited Event Tests ----
  describe("MessageEdited Event Processing", () => {
    it("should update content of existing message", () => {
      // Add message first
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "Original",
      };
      projection.process(addEvent);

      // Edit message
      const editEvent: MessageEditedEvent = {
        type: "MessageEdited",
        messageId: "msg-1",
        newContent: "Edited",
      };
      projection.process(editEvent);

      expect(projection.Messages[0].content).toBe("Edited");
    });

    it("should not edit non-existent message (no error)", () => {
      const editEvent: MessageEditedEvent = {
        type: "MessageEdited",
        messageId: "non-existent",
        newContent: "Edited",
      };

      expect(() => projection.process(editEvent)).not.toThrow();
      expect(projection.Messages).toHaveLength(0);
    });

    it("should preserve other message properties when editing", () => {
      // Add message
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "Original",
      };
      projection.process(addEvent);

      // Edit message
      const editEvent: MessageEditedEvent = {
        type: "MessageEdited",
        messageId: "msg-1",
        newContent: "Edited",
      };
      projection.process(editEvent);

      expect(projection.Messages[0].id).toBe("msg-1");
      expect(projection.Messages[0].type).toBe("user-message");
      expect(projection.Messages[0].deleted).toBe(false);
      expect(projection.Messages[0].hiddenByChapterId).toBeUndefined();
    });
  });

  // ---- MessageDeleted Event Tests ----
  describe("MessageDeleted Event Processing", () => {
    it("should mark message as deleted (deleted = true)", () => {
      // Add message
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };
      projection.process(addEvent);

      // Delete message
      const deleteEvent: MessageDeletedEvent = {
        type: "MessageDeleted",
        messageId: "msg-1",
      };
      projection.process(deleteEvent);

      expect(projection.Messages[0].deleted).toBe(true);
    });

    it("should not throw error for non-existent message", () => {
      const deleteEvent: MessageDeletedEvent = {
        type: "MessageDeleted",
        messageId: "non-existent",
      };

      expect(() => projection.process(deleteEvent)).not.toThrow();
    });

    it("should preserve message content when marking deleted", () => {
      // Add message
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "Important content",
      };
      projection.process(addEvent);

      // Delete message
      const deleteEvent: MessageDeletedEvent = {
        type: "MessageDeleted",
        messageId: "msg-1",
      };
      projection.process(deleteEvent);

      expect(projection.Messages[0].content).toBe("Important content");
      expect(projection.Messages[0].deleted).toBe(true);
    });
  });

  // ---- MessagesDeleted (Batch) Event Tests ----
  describe("MessagesDeleted (Batch) Event Processing", () => {
    it("should mark multiple messages as deleted", () => {
      // Add multiple messages
      ["msg-1", "msg-2", "msg-3"].forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Batch delete
      const deleteEvent: MessagesDeletedEvent = {
        type: "MessagesDeleted",
        messageIds: ["msg-1", "msg-3"],
      };
      projection.process(deleteEvent);

      expect(projection.Messages[0].deleted).toBe(true);
      expect(projection.Messages[1].deleted).toBe(false);
      expect(projection.Messages[2].deleted).toBe(true);
    });

    it("should handle empty messageIds array", () => {
      const deleteEvent: MessagesDeletedEvent = {
        type: "MessagesDeleted",
        messageIds: [],
      };

      expect(() => projection.process(deleteEvent)).not.toThrow();
    });

    it("should handle mix of existing and non-existent IDs", () => {
      // Add one message
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };
      projection.process(addEvent);

      // Batch delete with mix of IDs
      const deleteEvent: MessagesDeletedEvent = {
        type: "MessagesDeleted",
        messageIds: ["msg-1", "non-existent-1", "non-existent-2"],
      };

      expect(() => projection.process(deleteEvent)).not.toThrow();
      expect(projection.Messages[0].deleted).toBe(true);
    });

    it("should mark all messages in large batch correctly", () => {
      // Add 100 messages
      const messageIds = Array.from({ length: 100 }, (_, i) => `msg-${i}`);
      messageIds.forEach((id) => {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: id,
          role: "user",
          content: `Content ${id}`,
        };
        projection.process(event);
      });

      // Batch delete all
      const deleteEvent: MessagesDeletedEvent = {
        type: "MessagesDeleted",
        messageIds,
      };
      projection.process(deleteEvent);

      const allDeleted = projection.Messages.every((m) => m.deleted === true);
      expect(allDeleted).toBe(true);
    });
  });

  // ---- CivitJobCreated Event Tests ----
  describe("CivitJobCreated Event Processing", () => {
    it("should add civit-job message with correct type", () => {
      const event: CivitJobCreatedEvent = {
        type: "CivitJobCreated",
        jobId: "job-123",
        prompt: "Generate image",
      };

      projection.process(event);

      expect(projection.Messages).toHaveLength(1);
      expect(projection.Messages[0].type).toBe("civit-job");
      expect(projection.Messages[0].id).toBe("job-123");
    });

    it("should store jobId and prompt in data", () => {
      const event: CivitJobCreatedEvent = {
        type: "CivitJobCreated",
        jobId: "job-123",
        prompt: "Generate a cat",
      };

      projection.process(event);

      expect(projection.Messages[0].data).toEqual({
        jobId: "job-123",
        prompt: "Generate a cat",
      });
    });

    it("should initialize with deleted as false", () => {
      const event: CivitJobCreatedEvent = {
        type: "CivitJobCreated",
        jobId: "job-123",
        prompt: "test",
      };

      projection.process(event);

      expect(projection.Messages[0].deleted).toBe(false);
    });

    it("should initialize with hiddenByChapterId as undefined", () => {
      const event: CivitJobCreatedEvent = {
        type: "CivitJobCreated",
        jobId: "job-123",
        prompt: "test",
      };

      projection.process(event);

      expect(projection.Messages[0].hiddenByChapterId).toBeUndefined();
    });
  });

  // ---- GetMessage Tests ----
  describe("GetMessage", () => {
    it("should return message by ID when it exists", () => {
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };
      projection.process(addEvent);

      const message = projection.GetMessage("msg-1");

      expect(message).toBeDefined();
      expect(message?.id).toBe("msg-1");
    });

    it("should return undefined when message doesn't exist", () => {
      const message = projection.GetMessage("non-existent");

      expect(message).toBeUndefined();
    });

    it("should return deleted messages (not filtered)", () => {
      // Add and delete message
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "test",
      };
      projection.process(addEvent);

      const deleteEvent: MessageDeletedEvent = {
        type: "MessageDeleted",
        messageId: "msg-1",
      };
      projection.process(deleteEvent);

      const message = projection.GetMessage("msg-1");

      expect(message).toBeDefined();
      expect(message?.deleted).toBe(true);
    });
  });

  // ---- GetMessages Tests ----
  describe("GetMessages", () => {
    it("should return only visible, non-deleted messages", () => {
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

      const messages = projection.GetMessages();

      expect(messages).toHaveLength(3);
    });

    it("should filter out messages with hiddenByChapterId set", () => {
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

      // Manually set hiddenByChapterId (simulating chapter creation)
      projection.Messages[0].hiddenByChapterId = "chapter-1";

      const messages = projection.GetMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("msg-2");
    });

    it("should filter out deleted messages", () => {
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

      // Delete one
      const deleteEvent: MessageDeletedEvent = {
        type: "MessageDeleted",
        messageId: "msg-1",
      };
      projection.process(deleteEvent);

      const messages = projection.GetMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("msg-2");
    });

    it("should filter out both hidden and deleted messages", () => {
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

      // Hide one, delete another
      projection.Messages[0].hiddenByChapterId = "chapter-1";
      const deleteEvent: MessageDeletedEvent = {
        type: "MessageDeleted",
        messageId: "msg-2",
      };
      projection.process(deleteEvent);

      const messages = projection.GetMessages();

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("msg-3");
    });

    it("should return empty array when all messages are hidden/deleted", () => {
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

      // Hide one, delete another
      projection.Messages[0].hiddenByChapterId = "chapter-1";
      const deleteEvent: MessageDeletedEvent = {
        type: "MessageDeleted",
        messageId: "msg-2",
      };
      projection.process(deleteEvent);

      const messages = projection.GetMessages();

      expect(messages).toHaveLength(0);
    });

    it("should return all messages when none are hidden/deleted", () => {
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

      const messages = projection.GetMessages();

      expect(messages).toHaveLength(3);
    });
  });

  // ---- Complex Integration Scenarios ----
  describe("Complex Integration Scenarios", () => {
    it("should handle rapid sequential events correctly", () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        type: "MessageCreated" as const,
        messageId: `msg-${i}`,
        role: "user" as const,
        content: `Content ${i}`,
      }));

      events.forEach((event) => projection.process(event));

      expect(projection.Messages).toHaveLength(50);
    });

    it("should handle all message event types in single projection instance", () => {
      // Add
      const addEvent: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-1",
        role: "user",
        content: "Original",
      };
      projection.process(addEvent);

      // Edit
      const editEvent: MessageEditedEvent = {
        type: "MessageEdited",
        messageId: "msg-1",
        newContent: "Edited",
      };
      projection.process(editEvent);

      // Add another
      const addEvent2: MessageCreatedEvent = {
        type: "MessageCreated",
        messageId: "msg-2",
        role: "assistant",
        content: "Response",
      };
      projection.process(addEvent2);

      // Delete first
      const deleteEvent: MessageDeletedEvent = {
        type: "MessageDeleted",
        messageId: "msg-1",
      };
      projection.process(deleteEvent);

      expect(projection.Messages).toHaveLength(2);
      expect(projection.Messages[0].content).toBe("Edited");
      expect(projection.Messages[0].deleted).toBe(true);
      expect(projection.Messages[1].deleted).toBe(false);
    });

    it("should preserve state across multiple process() calls", () => {
      // Add messages in separate process calls
      for (let i = 0; i < 5; i++) {
        const event: MessageCreatedEvent = {
          type: "MessageCreated",
          messageId: `msg-${i}`,
          role: "user",
          content: `Content ${i}`,
        };
        projection.process(event);
      }

      expect(projection.Messages).toHaveLength(5);
      expect(projection.Messages[0].id).toBe("msg-0");
      expect(projection.Messages[4].id).toBe("msg-4");
    });

    it("should maintain message order after various operations", () => {
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

      // Edit middle message
      const editEvent: MessageEditedEvent = {
        type: "MessageEdited",
        messageId: "msg-2",
        newContent: "Edited",
      };
      projection.process(editEvent);

      // Verify order maintained
      expect(projection.Messages[0].id).toBe("msg-1");
      expect(projection.Messages[1].id).toBe("msg-2");
      expect(projection.Messages[1].content).toBe("Edited");
      expect(projection.Messages[2].id).toBe("msg-3");
    });
  });
});
