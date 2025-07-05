import { describe, it, expect, beforeEach } from "vitest";
import { ChatPageManager } from "../../Managers/ChatPageManager";
import type { ChatPage } from "../../models/ChatPage";
import type { Message } from "../../Chat/ChatMessage";

describe("ChatPageManager", () => {
  let chatPageManager: ChatPageManager;
  const testChatId = "test-chat-123";

  beforeEach(() => {
    chatPageManager = new ChatPageManager(testChatId);
  });

  describe("constructor", () => {
    it("should initialize with empty pages when no pages provided", () => {
      const manager = new ChatPageManager(testChatId);
      expect(manager.getPages()).toHaveLength(0);
      expect(manager.getMessageList()).toHaveLength(0);
    });

    it("should initialize with provided pages", () => {
      const existingPages: ChatPage[] = [
        {
          pageId: "page-1",
          chatId: testChatId,
          messages: [
            { id: "msg-1", role: "user", content: "Hello" },
            { id: "msg-2", role: "system", content: "Hi there" },
          ],
        },
      ];

      const manager = new ChatPageManager(testChatId, existingPages);
      expect(manager.getPages()).toHaveLength(1);
      expect(manager.getMessageList()).toHaveLength(2);
    });
  });

  describe("addMessage", () => {
    it("should create first page when adding message to empty manager", () => {
      const message: Message = { id: "msg-1", role: "user", content: "Hello" };

      chatPageManager.addMessage(message);

      const pages = chatPageManager.getPages();
      expect(pages).toHaveLength(1);
      expect(pages[0].messages).toHaveLength(1);
      expect(pages[0].messages[0]).toEqual(message);
    });

    it("should add message to current page if not full", () => {
      const message1: Message = { id: "msg-1", role: "user", content: "Hello" };
      const message2: Message = { id: "msg-2", role: "system", content: "Hi" };

      chatPageManager.addMessage(message1);
      chatPageManager.addMessage(message2);

      const pages = chatPageManager.getPages();
      expect(pages).toHaveLength(1);
      expect(pages[0].messages).toHaveLength(2);
    });

    it("should create new page when current page is full", () => {
      // Add messages to fill a page (10 is the limit based on MAX_MESSAGES_PER_PAGE)
      for (let i = 0; i < 10; i++) {
        chatPageManager.addMessage({
          id: `msg-${i}`,
          role: i % 2 === 0 ? "user" : "system",
          content: `Message ${i}`,
        });
      }

      // Add one more message to trigger new page
      const overflowMessage: Message = {
        id: "msg-overflow",
        role: "user",
        content: "Overflow",
      };
      chatPageManager.addMessage(overflowMessage);

      const pages = chatPageManager.getPages();
      expect(pages).toHaveLength(2);
      expect(pages[1].messages).toHaveLength(1);
      expect(pages[1].messages[0]).toEqual(overflowMessage);
    });
  });

  describe("getMessageList", () => {
    it("should return empty array for empty manager", () => {
      expect(chatPageManager.getMessageList()).toHaveLength(0);
    });

    it("should return all messages across all pages in order", () => {
      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Hello" },
        { id: "msg-2", role: "system", content: "Hi" },
        { id: "msg-3", role: "user", content: "How are you?" },
      ];

      messages.forEach((msg) => chatPageManager.addMessage(msg));

      const messageList = chatPageManager.getMessageList();
      expect(messageList).toHaveLength(3);
      expect(messageList).toEqual(messages);
    });
  });

  describe("deleteMessage", () => {
    beforeEach(() => {
      // Setup some test messages
      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Hello" },
        { id: "msg-2", role: "system", content: "Hi" },
        { id: "msg-3", role: "user", content: "How are you?" },
        { id: "msg-4", role: "system", content: "I'm good" },
      ];

      messages.forEach((msg) => chatPageManager.addMessage(msg));
    });

    it("should delete specific message and return updated pages", () => {
      const updatedPages = chatPageManager.deleteMessage("msg-2");

      const allMessages = updatedPages.flatMap((page) => page.messages);
      expect(allMessages).toHaveLength(3);
      expect(allMessages.find((msg) => msg.id === "msg-2")).toBeUndefined();
    });

    it("should handle deleting non-existent message", () => {
      const originalPages = chatPageManager.getPages();
      const updatedPages = chatPageManager.deleteMessage("non-existent");

      expect(updatedPages).toEqual(originalPages);
    });
  });

  describe("findMessageLocation", () => {
    beforeEach(() => {
      // Add messages across multiple pages (10 per page)
      for (let i = 0; i < 25; i++) {
        chatPageManager.addMessage({
          id: `msg-${i}`,
          role: i % 2 === 0 ? "user" : "system",
          content: `Message ${i}`,
        });
      }
    });

    it("should find message location correctly", () => {
      const location = chatPageManager.findMessageLocation("msg-5");

      expect(location).toBeDefined();
      expect(location?.pageIndex).toBe(0); // Should be in first page
      expect(location?.messageIndex).toBe(5);
    });

    it("should find message in second page correctly", () => {
      const location = chatPageManager.findMessageLocation("msg-15");

      expect(location).toBeDefined();
      expect(location?.pageIndex).toBe(1); // Should be in second page
      expect(location?.messageIndex).toBe(5); // 15 - 10 = 5
    });

    it("should return null for non-existent message", () => {
      const location = chatPageManager.findMessageLocation("non-existent");
      expect(location).toBeNull();
    });
  });

  describe("getGlobalMessageIndex", () => {
    beforeEach(() => {
      // Add messages across multiple pages (10 per page)
      for (let i = 0; i < 25; i++) {
        chatPageManager.addMessage({
          id: `msg-${i}`,
          role: i % 2 === 0 ? "user" : "system",
          content: `Message ${i}`,
        });
      }
    });

    it("should return correct global index for message", () => {
      const globalIndex = chatPageManager.getGlobalMessageIndex("msg-15");
      expect(globalIndex).toBe(15);
    });

    it("should return -1 for non-existent message", () => {
      const globalIndex = chatPageManager.getGlobalMessageIndex("non-existent");
      expect(globalIndex).toBe(-1);
    });
  });

  describe("countMessagesFromIndex", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        chatPageManager.addMessage({
          id: `msg-${i}`,
          role: i % 2 === 0 ? "user" : "system",
          content: `Message ${i}`,
        });
      }
    });

    it("should count messages from given index", () => {
      const count = chatPageManager.countMessagesFromIndex("msg-3");

      expect(count.messageCount).toBe(7); // Messages from index 3 to end (inclusive)
      expect(count.pageCount).toBe(1); // Should be in one page
    });

    it("should handle non-existent message", () => {
      const count = chatPageManager.countMessagesFromIndex("non-existent");

      expect(count.messageCount).toBe(0);
      expect(count.pageCount).toBe(0);
    });
  });
});
