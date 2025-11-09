import { describe, it, expect } from "vitest";

describe("ChatHistoryAPI getChats filtering", () => {
  it("should filter out SAMPLE_IMAGE_GENERATOR from chat list", () => {
    const mockChats = ["chat-1", "chat-2", "SAMPLE_IMAGE_GENERATOR", "chat-3"];
    const filtered = mockChats.filter(
      (chatId: string) => chatId !== "SAMPLE_IMAGE_GENERATOR"
    );

    expect(filtered).toEqual(["chat-1", "chat-2", "chat-3"]);
    expect(filtered).not.toContain("SAMPLE_IMAGE_GENERATOR");
  });

  it("should return empty array when only SAMPLE_IMAGE_GENERATOR exists", () => {
    const mockChats = ["SAMPLE_IMAGE_GENERATOR"];
    const filtered = mockChats.filter(
      (chatId: string) => chatId !== "SAMPLE_IMAGE_GENERATOR"
    );

    expect(filtered).toEqual([]);
  });

  it("should return all chats when no SAMPLE_IMAGE_GENERATOR exists", () => {
    const mockChats = ["chat-1", "chat-2", "chat-3"];
    const filtered = mockChats.filter(
      (chatId: string) => chatId !== "SAMPLE_IMAGE_GENERATOR"
    );

    expect(filtered).toEqual(mockChats);
  });
});
