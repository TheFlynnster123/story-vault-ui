import { describe, expect, it } from "vitest";
import {
  DEFAULT_INSPECTION_CONTEXT_COUNT,
  getMessageAgeLabel,
  getRecentContext,
  getTimestampFromMessageId,
} from "./messageInspectionContext";

describe("getRecentContext", () => {
  it("returns the three most recent items in chronological order", () => {
    const messages = ["one", "two", "three", "four", "five"];

    expect(
      getRecentContext(messages, DEFAULT_INSPECTION_CONTEXT_COUNT),
    ).toEqual(["three", "four", "five"]);
  });

  it("returns all items when the requested count is larger", () => {
    expect(getRecentContext(["one", "two"], 3)).toEqual(["one", "two"]);
  });
});

describe("message age", () => {
  it("extracts an embedded millisecond timestamp", () => {
    expect(
      getTimestampFromMessageId("reasoning-1784387756457-qpwfyos"),
    ).toBe(1784387756457);
  });

  it("labels user messages as sent", () => {
    expect(
      getMessageAgeLabel(
        { id: "user-1000000000000-id", role: "user" },
        1000000010000,
      ),
    ).toBe("Sent 10s ago");
  });

  it("labels assistant messages as received", () => {
    expect(
      getMessageAgeLabel(
        { id: "assistant-1000000000000-id", role: "assistant" },
        1000000060000,
      ),
    ).toBe("Received 1m ago");
  });

  it("handles IDs without timestamps", () => {
    expect(
      getMessageAgeLabel({ id: "temporary", role: "system" }),
    ).toBe("Received time unknown");
  });
});
