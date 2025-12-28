import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

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
const DEBOUNCE_MS = 50;

class TestBlob extends ManagedBlob<{ value: string }> {
  protected getBlobName = () => "test-blob";
  protected getDebounceMs = () => DEBOUNCE_MS;
}

// --- Helpers ---
const createBlob = () => new TestBlob("chat-123");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const waitForDebounce = () => wait(DEBOUNCE_MS + 20);

// --- Tests ---
describe("ManagedBlob - Debounce Stress Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("multiple saveDebounced calls coalesce into one API call", async () => {
    const blob = createBlob();

    blob.saveDebounced({ value: "first" });
    blob.saveDebounced({ value: "second" });
    blob.saveDebounced({ value: "third" });

    await waitForDebounce();

    expect(blobApi.saveBlob).toHaveBeenCalledTimes(1);
    expect(blobApi.saveBlob).toHaveBeenCalledWith(
      "chat-123",
      "test-blob",
      JSON.stringify({ value: "third" })
    );
  });

  it("save() cancels pending debounced save", async () => {
    const blob = createBlob();

    blob.saveDebounced({ value: "debounced" });
    await blob.save({ value: "immediate" });

    await waitForDebounce();

    expect(blobApi.saveBlob).toHaveBeenCalledTimes(1);
    expect(blobApi.saveBlob).toHaveBeenCalledWith(
      "chat-123",
      "test-blob",
      JSON.stringify({ value: "immediate" })
    );
  });

  it("delete() cancels pending debounced save", async () => {
    const blob = createBlob();

    blob.saveDebounced({ value: "will-be-deleted" });
    await blob.delete();

    await waitForDebounce();

    expect(blobApi.saveBlob).not.toHaveBeenCalled();
    expect(blobApi.deleteBlob).toHaveBeenCalledTimes(1);
  });

  it("interleaved save/saveDebounced - final state is last write", async () => {
    const blob = createBlob();

    blob.saveDebounced({ value: "debounced-1" });
    await blob.save({ value: "saved-1" });
    blob.saveDebounced({ value: "debounced-2" });
    blob.saveDebounced({ value: "debounced-3" });

    await waitForDebounce();

    // save() called once immediately, saveDebounced coalesces to one call
    expect(blobApi.saveBlob).toHaveBeenCalledTimes(2);
    expect(blobApi.saveBlob).toHaveBeenNthCalledWith(
      1,
      "chat-123",
      "test-blob",
      JSON.stringify({ value: "saved-1" })
    );
    expect(blobApi.saveBlob).toHaveBeenNthCalledWith(
      2,
      "chat-123",
      "test-blob",
      JSON.stringify({ value: "debounced-3" })
    );
  });

  it("saveDebounced followed by get() returns debounced data", async () => {
    blobApi.getBlob.mockResolvedValue(JSON.stringify({ value: "from-api" }));
    const blob = createBlob();

    blob.saveDebounced({ value: "local-update" });
    const result = await blob.get();

    expect(result).toEqual({ value: "local-update" });
    expect(blobApi.getBlob).not.toHaveBeenCalled(); // Cache was already initialized
  });
});
