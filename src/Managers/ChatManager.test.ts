import { describe, it, expect } from "vitest";
import { ChatManager } from "./ChatManager";
import type { Message } from "../pages/Chat/ChatMessage";

describe("ChatManager", () => {
  const mockChatId = "test-chat-123";
  const mockMessages: Message[] = [
    { id: "1", role: "user", content: "Hello" },
    { id: "2", role: "assistant", content: "Hi there!" },
    { id: "3", role: "user", content: "How are you?" },
    {
      id: "4",
      role: "civit-job",
      content: JSON.stringify({ jobId: "job-123" }),
    },
    { id: "5", role: "assistant", content: "I'm doing well!" },
  ];

  describe("constructor", () => {
    it("should initialize with chatId and empty messages array when no messages provided", () => {
      const manager = new ChatManager(mockChatId);

      expect(manager.getChatId()).toBe(mockChatId);
      expect(manager.getMessages()).toEqual([]);
    });

    it("should initialize with provided messages", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      expect(manager.getChatId()).toBe(mockChatId);
      expect(manager.getMessages()).toEqual(mockMessages);
    });
  });

  describe("addMessage", () => {
    it("should add a message to the messages array", () => {
      const manager = new ChatManager(mockChatId);
      const newMessage: Message = {
        id: "new",
        role: "user",
        content: "New message",
      };

      manager.addMessage(newMessage);

      expect(manager.getMessages()).toContain(newMessage);
      expect(manager.getMessages()).toHaveLength(1);
    });

    it("should append to existing messages", () => {
      const manager = new ChatManager(mockChatId, [mockMessages[0]]);
      const newMessage: Message = {
        id: "new",
        role: "user",
        content: "New message",
      };

      manager.addMessage(newMessage);

      expect(manager.getMessages()).toEqual([mockMessages[0], newMessage]);
    });
  });

  describe("getMessages", () => {
    it("should return all messages including civit-job messages", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const result = manager.getMessages();

      expect(result).toEqual(mockMessages);
      expect(result.some((msg: Message) => msg.role === "civit-job")).toBe(
        true
      );
    });
  });

  describe("getMessageList", () => {
    it("should return messages excluding civit-job messages", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const result = manager.getMessageList();
      const expectedMessages = mockMessages.filter(
        (msg) => msg.role !== "civit-job"
      );

      expect(result).toEqual(expectedMessages);
      expect(result.some((msg: Message) => msg.role === "civit-job")).toBe(
        false
      );
    });

    it("should return empty array when no non-civit-job messages exist", () => {
      const civitOnlyMessages: Message[] = [
        { id: "1", role: "civit-job", content: "{}" },
        { id: "2", role: "civit-job", content: "{}" },
      ];
      const manager = new ChatManager(mockChatId, civitOnlyMessages);

      const result = manager.getMessageList();

      expect(result).toEqual([]);
    });
  });

  describe("getMessage", () => {
    it("should return the message with matching id", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const result = manager.getMessage("3");

      expect(result).toEqual(mockMessages[2]);
    });

    it("should return null when message id does not exist", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const result = manager.getMessage("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null when messages array is empty", () => {
      const manager = new ChatManager(mockChatId);

      const result = manager.getMessage("any-id");

      expect(result).toBeNull();
    });
  });

  describe("deleteMessage", () => {
    it("should remove the message with matching id", () => {
      const manager = new ChatManager(mockChatId, [...mockMessages]);

      manager.deleteMessage("3");

      const remainingMessages = manager.getMessages();
      expect(remainingMessages).not.toContain(mockMessages[2]);
      expect(remainingMessages).toHaveLength(mockMessages.length - 1);
    });

    it("should do nothing when message id does not exist", () => {
      const manager = new ChatManager(mockChatId, [...mockMessages]);
      const originalLength = mockMessages.length;

      manager.deleteMessage("nonexistent");

      expect(manager.getMessages()).toHaveLength(originalLength);
    });

    it("should maintain order of remaining messages", () => {
      const manager = new ChatManager(mockChatId, [...mockMessages]);

      manager.deleteMessage("3"); // Remove middle message

      const remainingMessages = manager.getMessages();
      expect(remainingMessages[0]).toEqual(mockMessages[0]);
      expect(remainingMessages[1]).toEqual(mockMessages[1]);
      expect(remainingMessages[2]).toEqual(mockMessages[3]); // Was index 3, now index 2
    });
  });

  describe("deleteMessagesAfterIndex", () => {
    it("should remove the message and all messages after it", () => {
      const manager = new ChatManager(mockChatId, [...mockMessages]);

      manager.deleteMessagesAfterIndex("2"); // Remove from index 1 onwards

      const remainingMessages = manager.getMessages();
      expect(remainingMessages).toEqual([mockMessages[0]]); // Only first message remains
    });

    it("should remove all messages when deleting from first message", () => {
      const manager = new ChatManager(mockChatId, [...mockMessages]);

      manager.deleteMessagesAfterIndex("1");

      expect(manager.getMessages()).toEqual([]);
    });

    it("should only remove the last message when deleting from last message", () => {
      const manager = new ChatManager(mockChatId, [...mockMessages]);

      manager.deleteMessagesAfterIndex("5");

      const remainingMessages = manager.getMessages();
      expect(remainingMessages).toEqual(mockMessages.slice(0, -1));
    });

    it("should do nothing when message id does not exist", () => {
      const manager = new ChatManager(mockChatId, [...mockMessages]);
      const originalLength = mockMessages.length;

      manager.deleteMessagesAfterIndex("nonexistent");

      expect(manager.getMessages()).toHaveLength(originalLength);
    });
  });

  describe("getDeletePreview", () => {
    it("should return correct count for messages to be deleted from middle", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const result = manager.getDeletePreview("3"); // Index 2, should delete 3 messages

      expect(result).toEqual({ messageCount: 3 }); // Messages at index 2, 3, 4
    });

    it("should return correct count when deleting from first message", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const result = manager.getDeletePreview("1");

      expect(result).toEqual({ messageCount: mockMessages.length });
    });

    it("should return 1 when deleting only the last message", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const result = manager.getDeletePreview("5");

      expect(result).toEqual({ messageCount: 1 });
    });

    it("should return 0 when message id does not exist", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const result = manager.getDeletePreview("nonexistent");

      expect(result).toEqual({ messageCount: 0 });
    });

    it("should return 0 when messages array is empty", () => {
      const manager = new ChatManager(mockChatId);

      const result = manager.getDeletePreview("any-id");

      expect(result).toEqual({ messageCount: 0 });
    });
  });

  describe("getDeleteFromHerePreview", () => {
    it("should return same result as getDeletePreview", () => {
      const manager = new ChatManager(mockChatId, mockMessages);

      const previewResult = manager.getDeletePreview("3");
      const fromHereResult = manager.getDeleteFromHerePreview("3");

      expect(fromHereResult).toEqual(previewResult);
    });
  });

  describe("getChatId", () => {
    it("should return the chat id provided during construction", () => {
      const testChatId = "my-special-chat";
      const manager = new ChatManager(testChatId, mockMessages);

      expect(manager.getChatId()).toBe(testChatId);
    });
  });
});
