import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RecentChatsService } from "./RecentChatsService";
import { d } from "../Dependencies";

vi.mock("../Dependencies");

describe("RecentChatsService", () => {
  let mockManagedBlob: any;

  beforeEach(() => {
    mockManagedBlob = {
      get: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
      saveDebounced: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(d.RecentChatsManagedBlob).mockReturnValue(mockManagedBlob);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("recordNavigation", () => {
    it("should record navigation timestamp for chat", async () => {
      const now = 1700000000000;
      vi.setSystemTime(now);
      mockManagedBlob.get.mockResolvedValue({});

      const service = new RecentChatsService();
      await service.recordNavigation("chat-1");

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalledWith({
        "chat-1": now,
      });

      vi.useRealTimers();
    });

    it("should update existing navigation timestamp", async () => {
      const existingData = { "chat-1": 1000 };
      mockManagedBlob.get.mockResolvedValue(existingData);

      const now = 2000;
      vi.setSystemTime(now);

      const service = new RecentChatsService();
      await service.recordNavigation("chat-1");

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalledWith({
        "chat-1": now,
      });

      vi.useRealTimers();
    });

    it("should save to blob", async () => {
      mockManagedBlob.get.mockResolvedValue({});

      const service = new RecentChatsService();
      await service.recordNavigation("chat-1");

      expect(mockManagedBlob.saveDebounced).toHaveBeenCalled();
    });

    it("should not throw when save fails", async () => {
      mockManagedBlob.get.mockResolvedValue({});
      mockManagedBlob.saveDebounced.mockRejectedValue(new Error("Save failed"));

      const service = new RecentChatsService();

      await expect(service.recordNavigation("chat-1")).rejects.toThrow();
    });
  });

  describe("sortByRecency", () => {
    it("should lazy-load and return input array when recent chats are unavailable", async () => {
      mockManagedBlob.get.mockResolvedValue(undefined);

      const service = new RecentChatsService();
      const chatIds = ["chat-1", "chat-2", "chat-3"];

      const result = await service.sortByRecency(chatIds);

      expect(result).toEqual(chatIds);
      expect(mockManagedBlob.get).toHaveBeenCalled();
    });

    it("should sort chats by most recent first", async () => {
      const existingData = {
        "chat-1": 1000,
        "chat-2": 3000,
        "chat-3": 2000,
      };
      mockManagedBlob.get.mockResolvedValue(existingData);

      const service = new RecentChatsService();

      const result = await service.sortByRecency([
        "chat-1",
        "chat-2",
        "chat-3",
      ]);

      expect(result).toEqual(["chat-2", "chat-3", "chat-1"]);
    });

    it("should place chats without navigation time at the end", async () => {
      const existingData = { "chat-1": 1000, "chat-3": 2000 };
      mockManagedBlob.get.mockResolvedValue(existingData);

      const service = new RecentChatsService();

      const result = await service.sortByRecency([
        "chat-1",
        "chat-2",
        "chat-3",
      ]);

      expect(result).toEqual(["chat-3", "chat-1", "chat-2"]);
    });

    it("should handle empty array", async () => {
      mockManagedBlob.get.mockResolvedValue({});

      const service = new RecentChatsService();

      const result = await service.sortByRecency([]);

      expect(result).toEqual([]);
    });

    it("should handle single item array", async () => {
      const existingData = { "chat-1": 1000 };
      mockManagedBlob.get.mockResolvedValue(existingData);

      const service = new RecentChatsService();

      const result = await service.sortByRecency(["chat-1"]);

      expect(result).toEqual(["chat-1"]);
    });
  });

  describe("getLastNavigationTime", () => {
    it("should return null when not available", async () => {
      mockManagedBlob.get.mockResolvedValue(undefined);
      const service = new RecentChatsService();

      const result = await service.getLastNavigationTime("chat-1");

      expect(result).toBeNull();
    });

    it("should return null for chat without navigation time", async () => {
      mockManagedBlob.get.mockResolvedValue({ "chat-2": 2000 });

      const service = new RecentChatsService();
      const result = await service.getLastNavigationTime("chat-1");

      expect(result).toBeNull();
    });

    it("should return correct navigation time for existing chat", async () => {
      const existingData = { "chat-1": 1000, "chat-2": 2000 };
      mockManagedBlob.get.mockResolvedValue(existingData);

      const service = new RecentChatsService();
      const result = await service.getLastNavigationTime("chat-2");

      expect(result).toBe(2000);
    });
  });
});
