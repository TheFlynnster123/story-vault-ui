import { describe, it, expect, beforeEach, vi } from "vitest";

// --- Mocks ---
const blobApi = {
  getBlob: vi.fn(),
  saveBlob: vi.fn().mockResolvedValue(true),
  deleteBlob: vi.fn().mockResolvedValue(true),
};

vi.mock("../../Dependencies", () => ({
  d: {
    BlobAPI: () => blobApi,
    ErrorService: () => ({ log: vi.fn() }),
  },
}));

import { ManagedBlob } from "../ManagedBlob";

// --- Test Implementation ---
class TestBlob extends ManagedBlob<{ value: string }> {
  protected getBlobName = () => "test-blob";
}

// --- Helpers ---
const createBlob = () => new TestBlob("chat-123");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Tests ---
describe("ManagedBlob - Concurrent get() Stress Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscriber calling get() during fetch does not trigger additional API calls", async () => {
    // Simulate slow API response
    blobApi.getBlob.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(JSON.stringify({ value: "data" })), 50)
        )
    );

    const blob = createBlob();
    let subscriberCallCount = 0;

    // This simulates what useChatSettings does:
    // Subscribe with a callback that calls get()
    blob.subscribe(async () => {
      subscriberCallCount++;
      await blob.get(); // Subscriber calls get() on every notification
    });

    // Initial get() - this should only trigger ONE API call
    await blob.get();

    // Wait for any cascading effects
    await wait(100);

    // The API should only be called ONCE, not multiple times
    expect(blobApi.getBlob).toHaveBeenCalledTimes(1);
    // Subscriber may be called multiple times (loading state changes), but that's fine
    expect(subscriberCallCount).toBeGreaterThan(0);
  });

  it("multiple concurrent get() calls return same promise and make one API call", async () => {
    blobApi.getBlob.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(JSON.stringify({ value: "data" })), 50)
        )
    );

    const blob = createBlob();

    // Fire off multiple get() calls concurrently
    const [result1, result2, result3] = await Promise.all([
      blob.get(),
      blob.get(),
      blob.get(),
    ]);

    expect(blobApi.getBlob).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ value: "data" });
    expect(result2).toEqual({ value: "data" });
    expect(result3).toEqual({ value: "data" });
  });
});
