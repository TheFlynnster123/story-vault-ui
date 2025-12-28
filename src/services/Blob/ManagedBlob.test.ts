import { describe, it, expect, beforeEach, vi } from "vitest";

const blobApi = {
  getBlob: vi.fn(),
  saveBlob: vi.fn().mockResolvedValue(true),
  deleteBlob: vi.fn().mockResolvedValue(true),
};

const mockErrorService = {
  log: vi.fn(),
};

vi.mock("../Dependencies", () => ({
  d: {
    BlobAPI: () => blobApi,
    ErrorService: () => mockErrorService,
  },
}));

import { ManagedBlob } from "./ManagedBlob";

// Simple concrete test implementation
class TestManagedBlob extends ManagedBlob<TestData> {
  protected getBlobName(): string {
    return "test-blob";
  }

  protected getDebounceMs(): number {
    return 100;
  }
}

interface TestData {
  value: string;
}

describe("ManagedBlob - Basic Functionality", () => {
  const testChatId = "test-chat-123";

  beforeEach(() => {
    vi.clearAllMocks();
    blobApi.getBlob.mockReset();
    blobApi.saveBlob.mockReset().mockResolvedValue(true);
    blobApi.deleteBlob.mockReset().mockResolvedValue(true);
    mockErrorService.log.mockReset();
  });

  describe("get", () => {
    it("fetches from API and returns parsed data", async () => {
      blobApi.getBlob.mockResolvedValue(JSON.stringify({ value: "test" }));
      const blob = new TestManagedBlob(testChatId);

      const result = await blob.get();

      expect(result).toEqual({ value: "test" });
      expect(blobApi.getBlob).toHaveBeenCalledWith(testChatId, "test-blob");
    });

    it("returns cached data on subsequent calls without fetching", async () => {
      blobApi.getBlob.mockResolvedValue(JSON.stringify({ value: "test" }));
      const blob = new TestManagedBlob(testChatId);

      await blob.get();
      await blob.get();

      expect(blobApi.getBlob).toHaveBeenCalledTimes(1);
    });

    it("returns undefined when blob not found (404)", async () => {
      blobApi.getBlob.mockRejectedValue(new Error("Blob not found!"));
      const blob = new TestManagedBlob(testChatId);

      const result = await blob.get();

      expect(result).toBeUndefined();
    });

    it("throws on non-404 errors", async () => {
      blobApi.getBlob.mockRejectedValue(new Error("Server error"));
      const blob = new TestManagedBlob(testChatId);

      await expect(blob.get()).rejects.toThrow("Server error");
    });
  });

  describe("save", () => {
    it("updates local cache immediately", async () => {
      const blob = new TestManagedBlob(testChatId);

      await blob.save({ value: "saved" });

      expect(await blob.get()).toEqual({ value: "saved" });
    });

    it("persists data to backend", async () => {
      const blob = new TestManagedBlob(testChatId);

      await blob.save({ value: "saved" });

      expect(blobApi.saveBlob).toHaveBeenCalledWith(
        testChatId,
        "test-blob",
        JSON.stringify({ value: "saved" })
      );
    });

    it("notifies subscribers", async () => {
      const blob = new TestManagedBlob(testChatId);
      const subscriber = vi.fn();
      blob.subscribe(subscriber);

      await blob.save({ value: "saved" });

      expect(subscriber).toHaveBeenCalled();
    });
  });

  describe("saveDebounced", () => {
    it("updates local cache immediately", async () => {
      const blob = new TestManagedBlob(testChatId);

      blob.saveDebounced({ value: "debounced" });

      expect(await blob.get()).toEqual({ value: "debounced" });
    });

    it("does not persist immediately", () => {
      const blob = new TestManagedBlob(testChatId);

      blob.saveDebounced({ value: "debounced" });

      expect(blobApi.saveBlob).not.toHaveBeenCalled();
    });

    it("notifies subscribers immediately", () => {
      const blob = new TestManagedBlob(testChatId);
      const subscriber = vi.fn();
      blob.subscribe(subscriber);

      blob.saveDebounced({ value: "debounced" });

      expect(subscriber).toHaveBeenCalled();
    });
  });

  describe("refetch", () => {
    it("fetches fresh data from API", async () => {
      blobApi.getBlob
        .mockResolvedValueOnce(JSON.stringify({ value: "old" }))
        .mockResolvedValueOnce(JSON.stringify({ value: "new" }));
      const blob = new TestManagedBlob(testChatId);

      await blob.get();
      const result = await blob.refetch();

      expect(blobApi.getBlob).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ value: "new" });
    });
  });

  describe("delete", () => {
    it("clears local cache", async () => {
      blobApi.getBlob.mockResolvedValue(JSON.stringify({ value: "test" }));
      const blob = new TestManagedBlob(testChatId);

      await blob.get();
      await blob.delete();

      // After delete, get() should fetch again (returns undefined since blob doesn't exist)
      blobApi.getBlob.mockResolvedValue(null);
      expect(await blob.get()).toBeUndefined();
    });

    it("calls deleteBlob on API", async () => {
      const blob = new TestManagedBlob(testChatId);

      await blob.delete();

      expect(blobApi.deleteBlob).toHaveBeenCalledWith(testChatId, "test-blob");
    });

    it("notifies subscribers", async () => {
      const blob = new TestManagedBlob(testChatId);
      const subscriber = vi.fn();
      blob.subscribe(subscriber);

      await blob.delete();

      expect(subscriber).toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("returns unsubscribe function that stops notifications", async () => {
      const blob = new TestManagedBlob(testChatId);
      const subscriber = vi.fn();

      const unsubscribe = blob.subscribe(subscriber);
      unsubscribe();

      await blob.save({ value: "test" });

      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe("isLoading", () => {
    it("returns false initially", () => {
      const blob = new TestManagedBlob(testChatId);

      expect(blob.isLoading()).toBe(false);
    });

    it("returns false after loading completes", async () => {
      blobApi.getBlob.mockResolvedValue(JSON.stringify({ value: "test" }));
      const blob = new TestManagedBlob(testChatId);

      await blob.get();

      expect(blob.isLoading()).toBe(false);
    });
  });
});
