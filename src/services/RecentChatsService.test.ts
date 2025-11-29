import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RecentChatsService } from "./RecentChatsService";
import { d } from "../app/Dependencies/Dependencies";

vi.mock("../app/Dependencies/Dependencies");

describe("RecentChatsService", () => {
  let mockBlobAPI: any;

  beforeEach(() => {
    mockBlobAPI = {
      getBlob: vi.fn().mockResolvedValue(null),
      saveBlob: vi.fn().mockResolvedValue(true),
      GLOBAL_CHAT_ID: "global",
    };

    vi.mocked(d.BlobAPI).mockReturnValue(mockBlobAPI);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("load", () => {
    it("should load empty data when blob does not exist", async () => {
      mockBlobAPI.getBlob.mockResolvedValue(null);

      const service = new RecentChatsService();
      const result = await service.load();

      expect(result).toEqual({});
      expectBlobAPICalledWithGlobalFolder();
    });

    it("should parse existing blob data", async () => {
      const existingData = { "chat-1": 1000, "chat-2": 2000 };
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

      const service = new RecentChatsService();
      const result = await service.load();

      expect(result).toEqual(existingData);
    });

    it("should return cached data on subsequent calls", async () => {
      const existingData = { "chat-1": 1000 };
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

      const service = new RecentChatsService();
      await service.load();
      await service.load();
      await service.load();

      expect(mockBlobAPI.getBlob).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent load calls without race conditions", async () => {
      const existingData = { "chat-1": 1000 };
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

      const service = new RecentChatsService();
      const promises = [service.load(), service.load(), service.load()];

      const results = await Promise.all(promises);

      expect(mockBlobAPI.getBlob).toHaveBeenCalledTimes(1);
      results.forEach((result) => expect(result).toEqual(existingData));
    });

    it("should return empty data when blob not found error occurs", async () => {
      mockBlobAPI.getBlob.mockRejectedValue(new Error("Blob not found!"));

      const service = new RecentChatsService();
      const result = await service.load();

      expect(result).toEqual({});
    });

    it("should return empty data on unknown errors", async () => {
      mockBlobAPI.getBlob.mockRejectedValue(new Error("Network error"));

      const service = new RecentChatsService();
      const result = await service.load();

      expect(result).toEqual({});
    });
  });

  describe("recordNavigation", () => {
    it("should record navigation timestamp for chat", async () => {
      const now = 1700000000000;
      vi.setSystemTime(now);

      const service = new RecentChatsService();
      await service.recordNavigation("chat-1");

      expect(service.getLastNavigationTime("chat-1")).toBe(now);

      vi.useRealTimers();
    });

    it("should update existing navigation timestamp", async () => {
      const existingData = { "chat-1": 1000 };
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

      const now = 2000;
      vi.setSystemTime(now);

      const service = new RecentChatsService();
      await service.recordNavigation("chat-1");

      expect(service.getLastNavigationTime("chat-1")).toBe(now);

      vi.useRealTimers();
    });

    it("should fire-and-forget save to blob", async () => {
      const service = new RecentChatsService();
      await service.recordNavigation("chat-1");

      expect(mockBlobAPI.saveBlob).toHaveBeenCalled();
    });

    it("should not throw when save fails", async () => {
      mockBlobAPI.saveBlob.mockRejectedValue(new Error("Save failed"));

      const service = new RecentChatsService();

      await expect(service.recordNavigation("chat-1")).resolves.not.toThrow();
    });

    it("should save correct data to blob", async () => {
      const now = 1700000000000;
      vi.setSystemTime(now);

      const service = new RecentChatsService();
      await service.recordNavigation("chat-1");

      await flushPromises();

      expect(mockBlobAPI.saveBlob).toHaveBeenCalledWith(
        "global",
        "recent-chats.json",
        JSON.stringify({ "chat-1": now })
      );

      vi.useRealTimers();
    });
  });

  describe("sortByRecency", () => {
    it("should lazy-load and sort when blob is empty", async () => {
      mockBlobAPI.getBlob.mockResolvedValue(null);
      const service = new RecentChatsService();
      const chatIds = ["chat-1", "chat-2", "chat-3"];

      const result = await service.sortByRecency(chatIds);

      expect(result).toEqual(chatIds);
      expect(mockBlobAPI.getBlob).toHaveBeenCalled();
    });

    it("should sort chats by most recent first", async () => {
      const existingData = {
        "chat-1": 1000,
        "chat-2": 3000,
        "chat-3": 2000,
      };
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

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
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

      const service = new RecentChatsService();

      const result = await service.sortByRecency([
        "chat-1",
        "chat-2",
        "chat-3",
      ]);

      expect(result).toEqual(["chat-3", "chat-1", "chat-2"]);
    });

    it("should not mutate original array", async () => {
      const existingData = { "chat-1": 1000, "chat-2": 2000 };
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

      const service = new RecentChatsService();

      const original = ["chat-1", "chat-2"];
      await service.sortByRecency(original);

      expect(original).toEqual(["chat-1", "chat-2"]);
    });

    it("should handle empty array", async () => {
      const service = new RecentChatsService();

      const result = await service.sortByRecency([]);

      expect(result).toEqual([]);
    });

    it("should handle single item array", async () => {
      const existingData = { "chat-1": 1000 };
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

      const service = new RecentChatsService();

      const result = await service.sortByRecency(["chat-1"]);

      expect(result).toEqual(["chat-1"]);
    });
  });

  describe("getLastNavigationTime", () => {
    it("should return null when not loaded", () => {
      const service = new RecentChatsService();

      const result = service.getLastNavigationTime("chat-1");

      expect(result).toBeNull();
    });

    it("should return null for unknown chat", async () => {
      const service = new RecentChatsService();
      await service.load();

      const result = service.getLastNavigationTime("unknown-chat");

      expect(result).toBeNull();
    });

    it("should return timestamp for known chat", async () => {
      const existingData = { "chat-1": 1234567890 };
      mockBlobAPI.getBlob.mockResolvedValue(JSON.stringify(existingData));

      const service = new RecentChatsService();
      await service.load();

      const result = service.getLastNavigationTime("chat-1");

      expect(result).toBe(1234567890);
    });
  });

  describe("isLoaded", () => {
    it("should return false before load", () => {
      const service = new RecentChatsService();

      expect(service.isLoaded()).toBe(false);
    });

    it("should return true after load", async () => {
      const service = new RecentChatsService();
      await service.load();

      expect(service.isLoaded()).toBe(true);
    });

    it("should return true after load with empty data", async () => {
      mockBlobAPI.getBlob.mockResolvedValue(null);

      const service = new RecentChatsService();
      await service.load();

      expect(service.isLoaded()).toBe(true);
    });
  });

  function expectBlobAPICalledWithGlobalFolder(): void {
    expect(mockBlobAPI.getBlob).toHaveBeenCalledWith(
      "global",
      "recent-chats.json"
    );
  }

  function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
});
