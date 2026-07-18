import { describe, expect, it } from "vitest";
import type { TrackedMessage } from "../services/RequestTracker";
import {
  DEFAULT_VISIBLE_MESSAGE_COUNT,
  getRecentMessages,
} from "./recentMessageContext";

const messages = ["one", "two", "three", "four", "five"].map(
  (content): TrackedMessage => ({ role: "user", content }),
);

describe("getRecentMessages", () => {
  it("shows only the three most recent messages by default", () => {
    expect(getRecentMessages(messages, DEFAULT_VISIBLE_MESSAGE_COUNT)).toEqual(
      messages.slice(2),
    );
  });

  it("returns every message when fewer than the requested count exist", () => {
    expect(getRecentMessages(messages.slice(0, 2), 3)).toEqual(
      messages.slice(0, 2),
    );
  });
});
