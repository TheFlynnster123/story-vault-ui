import { describe, it, expect, vi } from "vitest";
import { toUserMessage, toSystemMessage } from "../../utils/messageUtils";

// Mock Date.now for consistent testing
const mockTimestamp = 1234567890;
vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

describe("messageUtils", () => {
  describe("toUserMessage", () => {
    it("should create a user message with correct structure", () => {
      const messageText = "Hello, world!";
      const result = toUserMessage(messageText);

      expect(result).toEqual({
        id: `user-${mockTimestamp}`,
        role: "user",
        content: messageText,
      });
    });

    it("should handle empty message text", () => {
      const result = toUserMessage("");

      expect(result).toEqual({
        id: `user-${mockTimestamp}`,
        role: "user",
        content: "",
      });
    });
  });

  describe("toSystemMessage", () => {
    it("should create a system message with correct structure", () => {
      const messageText = "System response";
      const result = toSystemMessage(messageText);

      expect(result).toEqual({
        id: `system-${mockTimestamp}`,
        role: "system",
        content: messageText,
      });
    });

    it("should handle empty system message", () => {
      const result = toSystemMessage("");

      expect(result).toEqual({
        id: `system-${mockTimestamp}`,
        role: "system",
        content: "",
      });
    });
  });
});
