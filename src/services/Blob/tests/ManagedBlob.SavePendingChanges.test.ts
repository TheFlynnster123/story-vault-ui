import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManagedBlob } from "../ManagedBlob";

const blobApi = {
  saveBlob: vi.fn().mockResolvedValue(true),
};

const mockErrorService = {
  log: vi.fn(),
};

vi.mock("../../Dependencies", () => ({
  d: {
    BlobAPI: () => blobApi,
    ErrorService: () => mockErrorService,
  },
}));

class TestBlob extends ManagedBlob<string> {
  protected getBlobName(): string {
    return "test-blob";
  }
}

describe("ManagedBlob.savePendingChanges", () => {
  const chatId = "test-chat-id";

  beforeEach(() => {
    vi.clearAllMocks();
    blobApi.saveBlob.mockReset().mockResolvedValue(true);
    mockErrorService.log.mockReset();
  });

  it("should do nothing when no debounced save is pending", async () => {
    const blob = new TestBlob(chatId);

    await blob.savePendingChanges();

    expect(blobApi.saveBlob).not.toHaveBeenCalled();
  });

  it("should save data when debounced save is pending", async () => {
    const blob = new TestBlob(chatId);
    const testData = "test-data";

    blob.saveDebounced(testData);

    await blob.savePendingChanges();

    expect(blobApi.saveBlob).toHaveBeenCalledWith(
      chatId,
      "test-blob",
      JSON.stringify(testData)
    );
  });

  it("should clear the debounce timeout when saving", async () => {
    vi.useFakeTimers();

    const blob = new TestBlob(chatId);
    blob.saveDebounced("test-data");

    await blob.savePendingChanges();

    // Fast-forward time to ensure debounce would have fired
    vi.advanceTimersByTime(5000);

    // saveBlob should only be called once (from savePendingChanges, not from the timeout)
    expect(blobApi.saveBlob).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("should be idempotent when called multiple times", async () => {
    const blob = new TestBlob(chatId);
    blob.saveDebounced("test-data");

    await blob.savePendingChanges();
    await blob.savePendingChanges();
    await blob.savePendingChanges();

    expect(blobApi.saveBlob).toHaveBeenCalledTimes(1);
  });

  it("should handle case when data is undefined", async () => {
    vi.useFakeTimers();

    const blob = new TestBlob(chatId);

    // Trigger debounce but with no data set
    // This simulates an edge case, though unlikely in practice
    (blob as any).debounceTimeout = setTimeout(() => {}, 4000);

    await blob.savePendingChanges();

    expect(blobApi.saveBlob).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("should propagate errors from persistToBlobAPI", async () => {
    const error = new Error("Network error");
    blobApi.saveBlob.mockRejectedValue(error);

    const blob = new TestBlob(chatId);
    blob.saveDebounced("test-data");

    await expect(blob.savePendingChanges()).rejects.toThrow("Network error");
  });
});
