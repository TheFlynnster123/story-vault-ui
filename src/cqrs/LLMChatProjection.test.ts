import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  LLMChatProjection,
  getLLMChatProjectionInstance,
  type LLMMessage,
} from "./LLMChatProjection";
import type {
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MessagesDeletedEvent,
  CivitJobCreatedEvent,
} from "./events/ChatEvent";

describe("LLMChatProjection - Core Operations", () => {
  let projection: LLMChatProjection;

  beforeEach(() => {
    projection = new LLMChatProjection();
  });

  // ---- Initialization Tests ----
  describe("Initialization", () => {
    it("should initialize with empty messages", () => {
      const messages = projection.GetMessages();

      expect(messages).toEqual([]);
    });

    it("should initialize with no subscribers", () => {
      const callback = vi.fn();
      projection.subscribe(callback);

      processMessageCreated(projection, "msg-1", "user", "test");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Singleton Pattern Tests ----
  describe("Singleton Pattern", () => {
    it("should return same instance for same chatId", () => {
      const instance1 = getLLMChatProjectionInstance("chat-123");
      const instance2 = getLLMChatProjectionInstance("chat-123");

      expect(instance1).toBe(instance2);
    });

    it("should return different instances for different chatIds", () => {
      const instance1 = getLLMChatProjectionInstance("chat-123");
      const instance2 = getLLMChatProjectionInstance("chat-456");

      expect(instance1).not.toBe(instance2);
    });

    it("should return null for null chatId", () => {
      const instance = getLLMChatProjectionInstance(null);

      expect(instance).toBeNull();
    });

    it("should create new instance if chatId does not exist", () => {
      const instance = getLLMChatProjectionInstance("new-chat");

      expect(instance).not.toBeNull();
      expect(instance).toBeInstanceOf(LLMChatProjection);
    });
  });

  // ---- Subscribe/Notify Pattern Tests ----
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

      processMessageCreated(projection, "msg-1", "user", "test");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should remove subscriber when unsubscribe is called", () => {
      const callback = vi.fn();
      const unsubscribe = projection.subscribe(callback);

      unsubscribe();
      processMessageCreated(projection, "msg-1", "user", "test");

      expect(callback).not.toHaveBeenCalled();
    });

    it("should not call unsubscribed callback after unsubscribe", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      projection.subscribe(callback1);
      const unsubscribe2 = projection.subscribe(callback2);

      unsubscribe2();
      processMessageCreated(projection, "msg-1", "user", "test");

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should handle multiple subscriptions and unsubscriptions", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      const unsub1 = projection.subscribe(callback1);
      const unsub2 = projection.subscribe(callback2);
      projection.subscribe(callback3);

      unsub1();
      unsub2();

      processMessageCreated(projection, "msg-1", "user", "test");

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalledTimes(1);
    });
  });

  // ---- MessageCreated Event Tests ----
  describe("MessageCreated Event", () => {
    it("should add message to projection", () => {
      processMessageCreated(projection, "msg-1", "user", "Hello");

      const messages = projection.GetMessages();

      expectMessageCount(messages, 1);
      expectMessageContent(messages[0], "user", "Hello");
    });

    it("should create message with correct properties", () => {
      processMessageCreated(projection, "msg-1", "assistant", "Hi there");

      const message = projection.GetMessage("msg-1");

      expect(message).not.toBeNull();
      expectMessageContent(message!, "assistant", "Hi there");
    });

    it("should notify subscribers after processing", () => {
      const callback = vi.fn();
      projection.subscribe(callback);

      processMessageCreated(projection, "msg-1", "user", "test");

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should add multiple messages in sequence", () => {
      processMessageCreated(projection, "msg-1", "user", "First");
      processMessageCreated(projection, "msg-2", "assistant", "Second");
      processMessageCreated(projection, "msg-3", "user", "Third");

      const messages = projection.GetMessages();

      expectMessageCount(messages, 3);
    });
  });

  // ---- MessageEdited Event Tests ----
  describe("MessageEdited Event", () => {
    it("should update content of existing message", () => {
      processMessageCreated(projection, "msg-1", "user", "Original");

      processMessageEdited(projection, "msg-1", "Updated");

      const message = projection.GetMessage("msg-1");
      expectMessageContent(message!, "user", "Updated");
    });

    it("should not update deleted message", () => {
      processMessageCreated(projection, "msg-1", "user", "Original");
      processMessageDeleted(projection, "msg-1");

      processMessageEdited(projection, "msg-1", "Updated");

      const message = projection.GetMessage("msg-1");
      expect(message).toBeNull();
    });

    it("should handle non-existent message gracefully", () => {
      processMessageEdited(projection, "non-existent", "Updated");

      const message = projection.GetMessage("non-existent");
      expect(message).toBeNull();
    });

    it("should notify subscribers after processing", () => {
      processMessageCreated(projection, "msg-1", "user", "Original");
      const callback = vi.fn();
      projection.subscribe(callback);

      processMessageEdited(projection, "msg-1", "Updated");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ---- MessageDeleted Event Tests ----
  describe("MessageDeleted Event", () => {
    it("should mark message as deleted", () => {
      processMessageCreated(projection, "msg-1", "user", "Content");

      processMessageDeleted(projection, "msg-1");

      const message = projection.GetMessage("msg-1");
      expect(message).toBeNull();
    });

    it("should remove message from GetMessages result", () => {
      processMessageCreated(projection, "msg-1", "user", "First");
      processMessageCreated(projection, "msg-2", "user", "Second");

      processMessageDeleted(projection, "msg-1");

      const messages = projection.GetMessages();
      expectMessageCount(messages, 1);
      expectMessageContent(messages[0], "user", "Second");
    });

    it("should handle non-existent message gracefully", () => {
      processMessageDeleted(projection, "non-existent");

      const messages = projection.GetMessages();
      expectMessageCount(messages, 0);
    });

    it("should notify subscribers after processing", () => {
      processMessageCreated(projection, "msg-1", "user", "Content");
      const callback = vi.fn();
      projection.subscribe(callback);

      processMessageDeleted(projection, "msg-1");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ---- MessagesDeleted Event Tests ----
  describe("MessagesDeleted Event", () => {
    it("should mark all specified messages as deleted", () => {
      processMessageCreated(projection, "msg-1", "user", "First");
      processMessageCreated(projection, "msg-2", "user", "Second");
      processMessageCreated(projection, "msg-3", "user", "Third");

      processMessagesDeleted(projection, ["msg-1", "msg-3"]);

      const messages = projection.GetMessages();
      expectMessageCount(messages, 1);
      expectMessageContent(messages[0], "user", "Second");
    });

    it("should handle mix of existing and non-existent messages", () => {
      processMessageCreated(projection, "msg-1", "user", "First");
      processMessageCreated(projection, "msg-2", "user", "Second");

      processMessagesDeleted(projection, ["msg-1", "non-existent", "msg-2"]);

      const messages = projection.GetMessages();
      expectMessageCount(messages, 0);
    });

    it("should handle empty messageIds array", () => {
      processMessageCreated(projection, "msg-1", "user", "Content");

      processMessagesDeleted(projection, []);

      const messages = projection.GetMessages();
      expectMessageCount(messages, 1);
    });

    it("should notify subscribers after processing", () => {
      processMessageCreated(projection, "msg-1", "user", "First");
      const callback = vi.fn();
      projection.subscribe(callback);

      processMessagesDeleted(projection, ["msg-1"]);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // ---- GetMessages Tests ----
  describe("GetMessages", () => {
    it("should return empty array when no messages exist", () => {
      const messages = projection.GetMessages();

      expectMessageCount(messages, 0);
    });

    it("should exclude deleted messages", () => {
      processMessageCreated(projection, "msg-1", "user", "First");
      processMessageCreated(projection, "msg-2", "user", "Second");
      processMessageDeleted(projection, "msg-1");

      const messages = projection.GetMessages();

      expectMessageCount(messages, 1);
      expectMessageContent(messages[0], "user", "Second");
    });

    it("should convert MessageState to LLMMessage format", () => {
      processMessageCreated(projection, "msg-1", "user", "Test content");

      const messages = projection.GetMessages();

      expect(messages[0]).toEqual({
        role: "user",
        content: "Test content",
      });
      expect(messages[0]).not.toHaveProperty("id");
      expect(messages[0]).not.toHaveProperty("deleted");
      expect(messages[0]).not.toHaveProperty("hiddenByChapterId");
    });

    it("should return all visible messages when no chapters exist", () => {
      processMessageCreated(projection, "msg-1", "user", "First");
      processMessageCreated(projection, "msg-2", "assistant", "Second");
      processMessageCreated(projection, "msg-3", "user", "Third");

      const messages = projection.GetMessages();

      expectMessageCount(messages, 3);
    });
  });

  // ---- GetMessage Tests ----
  describe("GetMessage", () => {
    it("should return message by ID", () => {
      processMessageCreated(projection, "msg-1", "user", "Content");

      const message = projection.GetMessage("msg-1");

      expect(message).not.toBeNull();
      expectMessageContent(message!, "user", "Content");
    });

    it("should convert MessageState to LLMMessage format", () => {
      processMessageCreated(projection, "msg-1", "assistant", "Response");

      const message = projection.GetMessage("msg-1");

      expect(message).toEqual({
        role: "assistant",
        content: "Response",
      });
    });

    it("should return null for deleted message", () => {
      processMessageCreated(projection, "msg-1", "user", "Content");
      processMessageDeleted(projection, "msg-1");

      const message = projection.GetMessage("msg-1");

      expect(message).toBeNull();
    });

    it("should return null for non-existent message", () => {
      const message = projection.GetMessage("non-existent");

      expect(message).toBeNull();
    });
  });

  // ---- CivitJobCreated Event Tests ----
  describe("CivitJobCreated Event (No-Op)", () => {
    it("should handle CivitJobCreated event without error", () => {
      const event: CivitJobCreatedEvent = {
        type: "CivitJobCreated",
        jobId: "job-1",
        prompt: "test prompt",
      };

      expect(() => projection.process(event)).not.toThrow();
    });

    it("should not notify subscribers for CivitJobCreated", () => {
      const callback = vi.fn();
      projection.subscribe(callback);

      const event: CivitJobCreatedEvent = {
        type: "CivitJobCreated",
        jobId: "job-1",
        prompt: "test prompt",
      };

      projection.process(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ---- Edge Cases ----
  describe("Edge Cases", () => {
    it("should handle very long content strings", () => {
      const longContent = "a".repeat(10000);

      processMessageCreated(projection, "msg-1", "user", longContent);

      const message = projection.GetMessage("msg-1");
      expect(message?.content).toBe(longContent);
    });

    it("should handle special characters in message content", () => {
      const specialContent = "Hello\n\tWorld\r\n\"Quotes\" and 'apostrophes'";

      processMessageCreated(projection, "msg-1", "user", specialContent);

      const message = projection.GetMessage("msg-1");
      expect(message?.content).toBe(specialContent);
    });

    it("should handle empty content string", () => {
      processMessageCreated(projection, "msg-1", "user", "");

      const message = projection.GetMessage("msg-1");
      expectMessageContent(message!, "user", "");
    });

    it("should handle rapid sequential message creation", () => {
      for (let i = 0; i < 100; i++) {
        processMessageCreated(projection, `msg-${i}`, "user", `Message ${i}`);
      }

      const messages = projection.GetMessages();
      expectMessageCount(messages, 100);
    });
  });

  // ---- Helper Functions ----
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

  function processMessagesDeleted(
    proj: LLMChatProjection,
    messageIds: string[]
  ): void {
    const event: MessagesDeletedEvent = {
      type: "MessagesDeleted",
      messageIds,
    };
    proj.process(event);
  }

  function expectMessageCount(messages: LLMMessage[], count: number): void {
    expect(messages).toHaveLength(count);
  }

  function expectMessageContent(
    message: LLMMessage,
    role: "user" | "assistant" | "system",
    content: string
  ): void {
    expect(message.role).toBe(role);
    expect(message.content).toBe(content);
  }
});
