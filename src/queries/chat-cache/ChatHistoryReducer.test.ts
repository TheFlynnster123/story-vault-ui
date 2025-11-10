import { describe, it, expect } from "vitest";
import { ChatHistoryReducer } from "./ChatHistoryReducer";
import type { Message } from "../../pages/Chat/ChatMessage";

describe("ChatHistoryReducer", () => {
  describe("reduce", () => {
    it("should process messages in order and apply deletions", () => {
      const messages: Message[] = [
        { id: "msg1", role: "user", content: "Hello" },
        { id: "msg2", role: "assistant", content: "Hi there" },
        { id: "msg3", role: "user", content: "How are you?" },
        {
          id: "delete1",
          role: "delete",
          content: JSON.stringify({
            type: "delete",
            messageId: "msg2",
            timestamp: Date.now(),
          }),
        },
      ];

      const result = ChatHistoryReducer.reduce(messages);

      expect(result).toHaveLength(2);
      expect(result.find((m) => m.id === "msg1")).toBeDefined();
      expect(result.find((m) => m.id === "msg2")).toBeUndefined();
      expect(result.find((m) => m.id === "msg3")).toBeDefined();
      expect(result.find((m) => m.role === "delete")).toBeUndefined();
    });

    it("should process multiple delete commands in order", () => {
      const messages: Message[] = [
        { id: "msg1", role: "user", content: "Hello" },
        { id: "msg2", role: "assistant", content: "Hi there" },
        { id: "msg3", role: "user", content: "How are you?" },
        { id: "msg4", role: "assistant", content: "I'm fine" },
        {
          id: "delete1",
          role: "delete",
          content: JSON.stringify({
            type: "delete",
            messageId: "msg2",
            timestamp: Date.now(),
          }),
        },
        {
          id: "delete2",
          role: "delete",
          content: JSON.stringify({
            type: "delete",
            messageId: "msg4",
            timestamp: Date.now(),
          }),
        },
      ];

      const result = ChatHistoryReducer.reduce(messages);

      expect(result).toHaveLength(2);
      expect(result.find((m) => m.id === "msg1")).toBeDefined();
      expect(result.find((m) => m.id === "msg2")).toBeUndefined();
      expect(result.find((m) => m.id === "msg3")).toBeDefined();
      expect(result.find((m) => m.id === "msg4")).toBeUndefined();
    });

    it("should handle deletion commands that arrive after the messages", () => {
      const messages: Message[] = [
        { id: "msg1", role: "user", content: "Hello" },
        { id: "msg2", role: "assistant", content: "Hi there" },
        {
          id: "delete1",
          role: "delete",
          content: JSON.stringify({
            type: "delete",
            messageId: "msg1",
            timestamp: Date.now(),
          }),
        },
        { id: "msg3", role: "user", content: "How are you?" },
      ];

      const result = ChatHistoryReducer.reduce(messages);

      expect(result).toHaveLength(2);
      expect(result.find((m) => m.id === "msg1")).toBeUndefined();
      expect(result.find((m) => m.id === "msg2")).toBeDefined();
      expect(result.find((m) => m.id === "msg3")).toBeDefined();
    });

    it("should return messages unchanged when no delete commands present", () => {
      const messages: Message[] = [
        { id: "msg1", role: "user", content: "Hello" },
        { id: "msg2", role: "assistant", content: "Hi there" },
      ];

      const result = ChatHistoryReducer.reduce(messages);

      expect(result).toEqual(messages);
    });
  });

  describe("createDeleteCommand", () => {
    it("should create valid delete command message", () => {
      const messageId = "test-id";
      const command = ChatHistoryReducer.createDeleteCommand(messageId);

      expect(command.role).toBe("delete");
      expect(command.id).toBeDefined();

      const parsedContent = JSON.parse(command.content);
      expect(parsedContent.type).toBe("delete");
      expect(parsedContent.messageId).toBe(messageId);
      expect(parsedContent.timestamp).toBeDefined();
    });
  });
});
